// background.js

const MAX_SESSIONS = 5; // Максимальное количество сессий

// Listener для сообщений от popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'saveSessionManually') {
		saveSession()
			.then(() => {
				sendResponse({ status: 'success' });
			})
			.catch((error) => {
				console.error('Error saving session:', error);
				sendResponse({ status: 'failure', error: error.message });
			});
		return true; // Указывает на асинхронный ответ
	} else if (message.action === 'scheduleSession') {
		scheduleSession(message.scheduledSession)
			.then(() => {
				sendResponse({ status: 'success' });
			})
			.catch((error) => {
				console.error('Error scheduling session:', error);
				sendResponse({ status: 'failure', error: error.message });
			});
		return true;
	} else if (message.action === 'cancelScheduledSession') {
		cancelScheduledSession(message.scheduleId)
			.then((wasCancelled) => {
				if (wasCancelled) {
					sendResponse({ status: 'success' });
				} else {
					sendResponse({ status: 'failure' });
				}
			})
			.catch((error) => {
				console.error('Error cancelling scheduled session:', error);
				sendResponse({ status: 'failure', error: error.message });
			});
		return true;
	}
});

// Функция для сохранения текущей сессии
async function saveSession() {
	const windows = await chrome.windows.getAll({ populate: true });
	const session = {
		timestamp: new Date().toISOString(),
		windows: windows.map((win) => ({
			id: win.id,
			focused: win.focused,
			incognito: win.incognito,
			state: win.state,
			type: win.type,
			tabs: win.tabs.map((tab) => ({
				id: tab.id,
				url: tab.url,
				title: tab.title,
				active: tab.active,
				pinned: tab.pinned,
			})),
		})),
	};

	// Получаем существующие авто-сессии
	chrome.storage.local.get(['autoSessions'], (result) => {
		let autoSessions = result.autoSessions || [];
		autoSessions.push(session);

		// Ограничиваем количество сессий до MAX_SESSIONS
		if (autoSessions.length > MAX_SESSIONS) {
			autoSessions = autoSessions.slice(autoSessions.length - MAX_SESSIONS);
		}

		// Сохраняем обратно в хранилище
		chrome.storage.local.set({ autoSessions }, () => {
			if (chrome.runtime.lastError) {
				console.error('Error saving session:', chrome.runtime.lastError);
				throw new Error(chrome.runtime.lastError.message);
			} else {
				console.log('Session saved successfully.');
			}
		});
	});
}

// Функция для планирования сессии (используя API alarms)
async function scheduleSession(scheduledSession) {
	// Сохраняем запланированную сессию в хранилище
	chrome.storage.local.get(['scheduledSessions'], (result) => {
		let scheduledSessions = result.scheduledSessions || [];
		scheduledSessions.push(scheduledSession);
		chrome.storage.local.set({ scheduledSessions }, () => {
			if (chrome.runtime.lastError) {
				console.error(
					'Error saving scheduled session:',
					chrome.runtime.lastError
				);
				throw new Error(chrome.runtime.lastError.message);
			} else {
				console.log('Scheduled session saved.');
				// Создаём будильник
				chrome.alarms.create(scheduledSession.id, {
					when: new Date(scheduledSession.time).getTime(),
				});
			}
		});
	});
}

// Функция для отмены запланированной сессии
async function cancelScheduledSession(scheduleId) {
	return new Promise((resolve, reject) => {
		// Удаляем из хранилища
		chrome.storage.local.get(['scheduledSessions'], (result) => {
			let scheduledSessions = result.scheduledSessions || [];
			const initialLength = scheduledSessions.length;
			scheduledSessions = scheduledSessions.filter((s) => s.id !== scheduleId);
			if (scheduledSessions.length === initialLength) {
				// Никакие сессии не удалены
				resolve(false);
				return;
			}

			chrome.storage.local.set({ scheduledSessions }, () => {
				if (chrome.runtime.lastError) {
					console.error(
						'Error cancelling scheduled session:',
						chrome.runtime.lastError
					);
					reject(new Error(chrome.runtime.lastError.message));
				} else {
					// Очищаем будильник
					chrome.alarms.clear(scheduleId, (wasCleared) => {
						if (wasCleared) {
							console.log('Scheduled session cancelled.');
							resolve(true);
						} else {
							console.log('No such alarm to cancel.');
							resolve(false);
						}
					});
				}
			});
		});
	});
}

// Listener для будильников
chrome.alarms.onAlarm.addListener((alarm) => {
	console.log(`Alarm triggered: ${alarm.name}`);

	chrome.storage.local.get(['scheduledSessions'], (result) => {
		const scheduledSessions = result.scheduledSessions || [];
		const session = scheduledSessions.find((s) => s.id === alarm.name);
		if (session) {
			if (session.type === 'session') {
				// Восстанавливаем сессию
				restoreSession(session.sessionId);
			} else if (session.type === 'custom') {
				// Открываем пользовательские ссылки в одном окне
				openCustomUrls(session.urls);
			}

			// Удаляем сессию из хранилища после выполнения
			chrome.storage.local.set(
				{
					scheduledSessions: scheduledSessions.filter(
						(s) => s.id !== alarm.name
					),
				},
				() => {
					if (chrome.runtime.lastError) {
						console.error(
							'Error removing executed scheduled session:',
							chrome.runtime.lastError
						);
					} else {
						console.log('Executed scheduled session removed from storage.');
					}
				}
			);
		}
	});
});

// Функция для восстановления сессии по sessionId
function restoreSession(sessionId) {
	chrome.storage.local.get(['autoSessions', 'changeSessions'], (result) => {
		const { autoSessions = [], changeSessions = [] } = result;
		let session = null;
		let sessionType = '';
		let sessionIndex = -1;

		// Ищем сессию в autoSessions
		autoSessions.forEach((s, index) => {
			if (`autoSessions_${index}` === sessionId) {
				session = s;
				sessionType = 'autoSessions';
				sessionIndex = index;
			}
		});

		// Если не найдена, ищем в changeSessions
		if (!session) {
			changeSessions.forEach((s, index) => {
				if (`changeSessions_${index}` === sessionId) {
					session = s;
					sessionType = 'changeSessions';
					sessionIndex = index;
				}
			});
		}

		if (session) {
			// Восстанавливаем каждое окно
			session.windows.forEach((win) => {
				const urls = win.tabs.map((tab) => tab.url);
				if (urls.length > 0) {
					const firstUrl = urls[0];
					const otherUrls = urls.slice(1);
					chrome.windows.create(
						{ url: firstUrl, state: 'normal' },
						(newWindow) => {
							if (newWindow && newWindow.id) {
								otherUrls.forEach((url, index) => {
									chrome.tabs.create({
										windowId: newWindow.id,
										url,
										index: index + 1,
									});
								});
							}
						}
					);
				}
			});
			console.log(`Session ${sessionId} restored.`);
		} else {
			console.error(`Session with ID ${sessionId} not found.`);
		}
	});
}

// Функция для открытия пользовательских ссылок в одном окне
function openCustomUrls(urls) {
	if (urls.length === 0) return;
	const firstUrl = urls[0];
	const otherUrls = urls.slice(1);
	chrome.windows.create({ url: firstUrl, state: 'normal' }, (newWindow) => {
		if (newWindow && newWindow.id) {
			otherUrls.forEach((url, index) => {
				chrome.tabs.create({
					windowId: newWindow.id,
					url,
					index: index + 1,
				});
			});
		}
	});
}
