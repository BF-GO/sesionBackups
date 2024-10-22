// background.js

const MAX_SESSIONS = 5; // Максимальное количество сессий
const SAVE_DEBOUNCE_DELAY = 1000; // 1 секунда

let saveTimeout = null;

// Функция для сохранения сессии (тип 'auto' или 'change')
function saveSession(type) {
	if (saveTimeout) {
		clearTimeout(saveTimeout);
	}

	saveTimeout = setTimeout(() => {
		chrome.windows.getAll({ populate: true }, (windows) => {
			const session = {
				timestamp: new Date().toISOString(),
				windows: windows.map((window) => ({
					id: window.id,
					tabs: window.tabs.map((tab) => tab.url),
				})),
			};

			const storageKey = type === 'auto' ? 'autoSessions' : 'changeSessions';

			chrome.storage.local.get([storageKey], (result) => {
				let sessions = result[storageKey] || [];
				sessions.push(session);

				// Ограничение количества сессий до MAX_SESSIONS
				if (sessions.length > MAX_SESSIONS) {
					sessions = sessions.slice(sessions.length - MAX_SESSIONS);
				}

				chrome.storage.local.set({ [storageKey]: sessions }, () => {
					if (chrome.runtime.lastError) {
						console.error(
							`Error saving ${type} session:`,
							chrome.runtime.lastError
						);
					} else {
						console.log(`Session of type ${type} saved successfully`);
					}
				});
			});
		});

		saveTimeout = null;
	}, SAVE_DEBOUNCE_DELAY);
}

// Функция для обновления таймера авто-сохранения
function updateAutoSaveAlarm() {
	chrome.storage.local.get(['autoBackupInterval'], (result) => {
		let interval = result.autoBackupInterval;
		if (!interval || isNaN(interval) || interval < 1) {
			interval = 10; // по умолчанию 10 минут
		}
		chrome.alarms.create('autoSaveAlarm', {
			periodInMinutes: parseInt(interval, 10),
		});
		console.log('Auto-save alarm set with interval:', interval, 'minutes');
	});
}

// Устанавливаем начальный таймер при установке или обновлении расширения
chrome.runtime.onInstalled.addListener(() => {
	updateAutoSaveAlarm();
});

// Слушаем изменения в хранилище для обновления таймера
chrome.storage.onChanged.addListener((changes, area) => {
	if (area === 'local' && changes.autoBackupInterval) {
		updateAutoSaveAlarm();
	}
});

// Обработка периодического сохранения сессий
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'autoSaveAlarm') {
		console.log('Auto-save alarm triggered');
		saveSession('auto'); // Сохраняем сессию

		// Проверяем, включены ли уведомления
		chrome.storage.local.get(['notificationsEnabled'], (result) => {
			if (result.notificationsEnabled) {
				// Показать уведомление
				chrome.notifications.create(
					'',
					{
						type: 'basic',
						iconUrl: 'icons/icon48.png',
						title: 'Session Saved',
						message: 'Automatic session backup completed.',
					},
					(notificationId) => {
						if (chrome.runtime.lastError) {
							console.error('Notification Error:', chrome.runtime.lastError);
						} else {
							console.log('Notification shown with ID:', notificationId);
						}
					}
				);
			} else {
				console.log('Notifications are disabled.');
			}
		});
	}
});

// Сохранение сессии при создании или закрытии вкладок
chrome.tabs.onCreated.addListener(() => {
	saveSession('change');
});

chrome.tabs.onRemoved.addListener(() => {
	saveSession('change');
});

// Слушаем сообщения от popup для ручного сохранения
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'saveSessionManually') {
		saveSession('change');
		sendResponse({ status: 'success' });
	}
});
