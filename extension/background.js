// background.js

const MAX_SESSIONS = 5; // Максимальное количество сессий

// Функция для сохранения сессии
async function saveSession(type = 'auto') {
	try {
		// Проверяем, включен ли тип сессий
		const enabledKey = `${type}SessionsEnabled`; // Например, 'manualSessionsEnabled'
		const result = await chrome.storage.local.get([enabledKey]);
		const isEnabled = result[enabledKey] !== false; // По умолчанию true

		if (!isEnabled) {
			console.log(`Сохранение сессии типа "${type}" отключено.`);
			return;
		}

		const windows = await chrome.windows.getAll({ populate: true });
		const session = {
			id: `${type}_${Date.now()}`, // Уникальный идентификатор с типом
			name:
				type === 'manual'
					? 'Ручная Сессия'
					: `${type.charAt(0).toUpperCase() + type.slice(1)} Сессия`,
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

		// Определяем ключ хранения на основе типа
		const storageKey =
			type === 'auto'
				? 'autoSessions'
				: type === 'change'
				? 'changeSessions'
				: 'manualSessions';

		// Получаем существующие сессии
		const storageResult = await chrome.storage.local.get([storageKey]);
		let sessions = storageResult[storageKey] || [];
		sessions.push(session);

		// Ограничиваем количество сессий до MAX_SESSIONS
		if (sessions.length > MAX_SESSIONS) {
			sessions = sessions.slice(sessions.length - MAX_SESSIONS);
		}

		// Сохраняем обратно в хранилище
		await chrome.storage.local.set({ [storageKey]: sessions });
		console.log(`Сессия типа "${type}" успешно сохранена.`);
		showNotification('Сессия Сохранена', `Сессия успешно сохранена (${type}).`);
	} catch (error) {
		console.error('Ошибка при сохранении сессии:', error);
		showNotification('Ошибка', 'Не удалось сохранить сессию.');
	}
}

// Функция для установки повторяющегося будильника
function setAutoBackupAlarm(intervalMinutes) {
	chrome.alarms.clear('autoBackup', () => {
		chrome.alarms.create('autoBackup', {
			periodInMinutes: intervalMinutes,
		});
		console.log(
			`Автоматическое резервное копирование установлено на каждые ${intervalMinutes} минут.`
		);
	});
}

// Инициализация автоматического резервного копирования при запуске расширения
chrome.runtime.onStartup.addListener(() => {
	chrome.storage.local.get(['autoBackupInterval'], (result) => {
		const interval = result.autoBackupInterval || 10; // Значение по умолчанию: 10 минут
		setAutoBackupAlarm(interval);
	});
});

// Обработка изменений в настройках для обновления будильника
chrome.storage.onChanged.addListener((changes, area) => {
	if (area === 'local' && changes.autoBackupInterval) {
		const newInterval = changes.autoBackupInterval.newValue;
		setAutoBackupAlarm(newInterval);
	}
});

// Listener для сообщений от popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'saveSessionManually') {
		saveSession('manual')
			.then(() => {
				sendResponse({ status: 'success' });
			})
			.catch((error) => {
				console.error('Ошибка при сохранении сессии:', error);
				sendResponse({ status: 'failure', error: error.message });
			});
		return true; // Указывает на асинхронный ответ
	} else if (message.action === 'scheduleSession') {
		scheduleSession(message.scheduledSession)
			.then(() => {
				sendResponse({ status: 'success' });
			})
			.catch((error) => {
				console.error('Ошибка при планировании сессии:', error);
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
				console.error('Ошибка при отмене запланированной сессии:', error);
				sendResponse({ status: 'failure', error: error.message });
			});
		return true;
	}
});

// Функция для планирования сессии (используя API alarms)
async function scheduleSession(scheduledSession) {
	try {
		// Проверяем, включен ли тип сессии
		const enabledKey = `${scheduledSession.type}SessionsEnabled`;
		const result = await chrome.storage.local.get([enabledKey]);
		const isEnabled = result[enabledKey] !== false;

		if (!isEnabled) {
			console.log(
				`Планирование сессии типа "${scheduledSession.type}" отключено.`
			);
			return;
		}

		// Сохраняем запланированную сессию в хранилище
		const storageResult = await chrome.storage.local.get(['scheduledSessions']);
		let scheduledSessions = storageResult.scheduledSessions || [];
		scheduledSessions.push(scheduledSession);
		await chrome.storage.local.set({ scheduledSessions });

		// Создаём будильник
		chrome.alarms.create(scheduledSession.id, {
			when: new Date(scheduledSession.time).getTime(),
		});
		console.log('Запланированная сессия сохранена и будильник установлен.');
	} catch (error) {
		console.error('Ошибка при планировании сессии:', error);
		throw error;
	}
}

// Функция для отмены запланированной сессии
function cancelScheduledSession(scheduleId) {
	return new Promise((resolve, reject) => {
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
						'Ошибка при отмене запланированной сессии:',
						chrome.runtime.lastError
					);
					reject(new Error(chrome.runtime.lastError.message));
				} else {
					// Очищаем будильник
					chrome.alarms.clear(scheduleId, (wasCleared) => {
						if (wasCleared) {
							console.log('Запланированная сессия отменена.');
							resolve(true);
						} else {
							console.log('Будильник для запланированной сессии не найден.');
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
	if (alarm.name === 'autoBackup') {
		console.log(
			'Срабатывание будильника автоматического резервного копирования.'
		);
		saveSession('auto');
	} else {
		console.log(`Будильник сработал: ${alarm.name}`);
		handleScheduledSession(alarm.name);
	}
});

// Обработка запланированной сессии
async function handleScheduledSession(alarmName) {
	try {
		const result = await chrome.storage.local.get(['scheduledSessions']);
		const scheduledSessions = result.scheduledSessions || [];
		const session = scheduledSessions.find((s) => s.id === alarmName);

		if (session) {
			if (session.type === 'session') {
				// Восстанавливаем сессию
				const [sessionType, sessionIndex] = session.sessionId.split('_');
				await restoreSessionByTypeAndIndex(sessionType, sessionIndex);
			} else if (session.type === 'custom') {
				// Открываем пользовательские ссылки
				await openCustomUrls(session.urls);
			}

			// Удаляем выполненную запланированную сессию из хранилища
			const updatedSessions = scheduledSessions.filter(
				(s) => s.id !== alarmName
			);
			await chrome.storage.local.set({ scheduledSessions: updatedSessions });
			console.log(`Запланированная сессия "${alarmName}" выполнена и удалена.`);
		} else {
			console.error(`Запланированная сессия с ID "${alarmName}" не найдена.`);
		}
	} catch (error) {
		console.error('Ошибка при обработке запланированной сессии:', error);
	}
}

// Функция для восстановления сессии по типу и индексу
function restoreSessionByTypeAndIndex(sessionType, sessionIndex) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];

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
				console.log(`Сессия "${session.id}" восстановлена.`);
				resolve();
			} else {
				console.error(
					`Сессия с ID "${sessionType}_${sessionIndex}" не найдена.`
				);
				reject(new Error('Сессия не найдена.'));
			}
		});
	});
}

// Функция для открытия пользовательских ссылок в одном окне
function openCustomUrls(urls) {
	return new Promise((resolve, reject) => {
		if (urls.length === 0) {
			resolve();
			return;
		}
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
				console.log(`Пользовательские URL-адреса открыты в новом окне.`);
				resolve();
			} else {
				console.error('Не удалось создать окно для пользовательских URL.');
				reject(new Error('Не удалось создать окно.'));
			}
		});
	});
}

// Listener для изменений во вкладках и окнах для сохранения сессий при изменениях
let saveSessionTimeout;
function debounceSaveSession() {
	clearTimeout(saveSessionTimeout);
	saveSessionTimeout = setTimeout(() => {
		saveSession('change');
	}, 1000); // Задержка 1 секунда после последнего изменения
}

// Слушатели событий для отслеживания изменений во вкладках и окнах
chrome.tabs.onCreated.addListener(debounceSaveSession);
chrome.tabs.onRemoved.addListener(debounceSaveSession);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url || changeInfo.status === 'complete') {
		debounceSaveSession();
	}
});
chrome.windows.onCreated.addListener(debounceSaveSession);
chrome.windows.onRemoved.addListener(debounceSaveSession);
chrome.windows.onFocusChanged.addListener(debounceSaveSession);

// Функция для отображения уведомлений
function showNotification(title, message) {
	chrome.storage.local.get(['notificationsEnabled'], (result) => {
		if (result.notificationsEnabled !== false) {
			if (chrome.notifications && chrome.notifications.create) {
				chrome.notifications.create(
					'',
					{
						type: 'basic',
						iconUrl: 'icons/icon48.png',
						title: title,
						message: message,
					},
					(notificationId) => {
						if (chrome.runtime.lastError) {
							console.error('Ошибка уведомления:', chrome.runtime.lastError);
						} else {
							console.log('Уведомление показано с ID:', notificationId);
						}
					}
				);
			} else {
				// Резервный вариант для браузеров без API уведомлений
				alert(`${title}: ${message}`);
			}
		}
	});
}
