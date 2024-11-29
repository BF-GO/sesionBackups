// Добавьте эти функции и изменения в ваш существующий файл background.js

// Обновите слушатель сообщений
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'saveSessionManually') {
		saveSession('change');
		sendResponse({ status: 'success' });
	} else if (message.action === 'scheduleSession') {
		scheduleSessionRestoration(message.scheduledSession);
		sendResponse({ status: 'success' });
	} else if (message.action === 'cancelScheduledSession') {
		cancelScheduledSession(message.scheduleId);
		sendResponse({ status: 'success' });
	}
});

// Функция для планирования восстановления сессии или открытия кастомных ссылок
function scheduleSessionRestoration(scheduledSession) {
	const scheduleTime = new Date(scheduledSession.time).getTime();
	const currentTime = Date.now();
	const delayInMinutes = (scheduleTime - currentTime) / 60000;

	if (delayInMinutes <= 0) {
		console.error('Cannot schedule a session in the past.');
		return;
	}

	// Создаем будильник
	chrome.alarms.create(scheduledSession.id, { when: scheduleTime });
	console.log(
		`Scheduled ${scheduledSession.type} with ID ${scheduledSession.id} to trigger at ${scheduledSession.time}`
	);
}

// Функция для отмены запланированной сессии
function cancelScheduledSession(scheduleId) {
	chrome.alarms.clear(scheduleId, (wasCleared) => {
		if (wasCleared) {
			console.log(`Cancelled scheduled session with id: ${scheduleId}`);
		} else {
			console.error(
				`Failed to cancel scheduled session with id: ${scheduleId}`
			);
		}
	});
}

// Обновите слушатель будильников
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'autoSaveAlarm') {
		console.log('Auto-save alarm triggered');
		saveSession('auto'); // Сохраняем сессию
	} else {
		// Обработка запланированного восстановления сессии или открытия кастомных ссылок
		console.log(`Alarm triggered: ${alarm.name}`);
		restoreScheduledSession(alarm.name);
	}
});

// Функция для восстановления запланированной сессии или открытия кастомных ссылок
function restoreScheduledSession(alarmName) {
	// alarmName является scheduleId
	chrome.storage.local.get(['scheduledSessions'], (result) => {
		const scheduledSessions = result.scheduledSessions || [];
		const scheduledSession = scheduledSessions.find((s) => s.id === alarmName);

		if (!scheduledSession) {
			console.error('Scheduled session not found for alarm:', alarmName);
			return;
		}

		if (scheduledSession.type === 'session') {
			// Разбираем sessionId для получения sessionType и индекса
			const [sessionType, sessionIndex] = scheduledSession.sessionId.split('_');
			const index = parseInt(sessionIndex, 10);

			chrome.storage.local.get([sessionType], (result) => {
				const sessions = result[sessionType] || [];
				const session = sessions[index];

				if (!session) {
					console.error('Session not found:', sessionType, index);
					return;
				}

				// Восстанавливаем все окна из сессии
				restoreAllWindows(session.windows);

				// Удаляем запланированную сессию, так как она выполнена
				removeScheduledSession(alarmName);
			});
		} else if (scheduledSession.type === 'custom') {
			// Восстанавливаем пользовательские ссылки
			restoreCustomUrls(scheduledSession.urls);

			// Удаляем запланированную сессию, так как она выполнена
			removeScheduledSession(alarmName);
		}
	});
}

// Функция для открытия кастомных ссылок
function restoreCustomUrls(urls) {
	if (!urls || urls.length === 0) return;

	// Открываем первую ссылку в новом окне
	const firstUrl = urls[0];
	const otherUrls = urls.slice(1);

	chrome.windows.create({ url: firstUrl, state: 'normal' }, (newWindow) => {
		if (!newWindow || !newWindow.id) {
			console.error('Failed to create new window.');
			// Можно добавить уведомление об ошибке
			return;
		}

		// Добавляем остальные вкладки
		otherUrls.forEach((url, index) => {
			chrome.tabs.create(
				{
					windowId: newWindow.id,
					url,
					index: index + 1, // Устанавливаем порядок вкладок
				},
				(tab) => {
					if (chrome.runtime.lastError) {
						console.error('Error creating tab:', chrome.runtime.lastError);
					}
				}
			);
		});
	});
}

// Функция для удаления запланированной сессии из хранилища
function removeScheduledSession(scheduleId) {
	chrome.storage.local.get(['scheduledSessions'], (result) => {
		let scheduledSessions = result.scheduledSessions || [];
		scheduledSessions = scheduledSessions.filter((s) => s.id !== scheduleId);
		chrome.storage.local.set({ scheduledSessions });
	});
}

// Остальные функции для восстановления окон остаются без изменений
// Функция для восстановления всех окон
function restoreAllWindows(windows) {
	console.log(`Restoring all ${windows.length} windows`);
	windows.forEach((window, windowIndex) => {
		setTimeout(() => {
			restoreWindow(window.tabs);
		}, windowIndex * 900); // Восстанавливаем каждое окно с задержкой
	});
}

// Функция для восстановления отдельного окна
function restoreWindow(tabs) {
	console.log(`Restoring window with ${tabs.length} tabs`);
	if (tabs.length === 0) return; // Проверяем, есть ли вкладки для восстановления

	const firstTab = tabs[0].url;
	const otherTabs = tabs.slice(1).map((tab) => tab.url);

	// Создаём новое окно с первой вкладкой
	chrome.windows.create({ url: firstTab, state: 'normal' }, (newWindow) => {
		if (!newWindow || !newWindow.id) {
			console.error('Failed to create new window.');
			// Можно добавить уведомление об ошибке
			return;
		}

		// Добавляем остальные вкладки
		otherTabs.forEach((url, index) => {
			chrome.tabs.create(
				{
					windowId: newWindow.id,
					url,
					index: index + 1, // Устанавливаем порядок вкладок
				},
				(tab) => {
					if (chrome.runtime.lastError) {
						console.error('Error creating tab:', chrome.runtime.lastError);
					}
				}
			);
		});
	});
}
