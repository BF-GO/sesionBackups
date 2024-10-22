// popup.js

const MAX_SESSIONS_DISPLAY = 5; // Максимальное количество сессий для отображения

// Функция для преобразования временной метки в удобный формат
function formatTimestamp(timestamp) {
	const date = new Date(timestamp);

	if (isNaN(date.getTime())) {
		console.error('Invalid date detected:', timestamp);
		return 'Invalid date';
	}

	return date.toLocaleString('en-GB', {
		timeZone: 'Europe/Helsinki',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

// Функция для загрузки сессий
function loadSessions() {
	// Загрузка автоматических сессий
	chrome.storage.local.get(['autoSessions'], (result) => {
		let autoSessions = result.autoSessions || [];
		// Ограничиваем количество отображаемых сессий
		if (autoSessions.length > MAX_SESSIONS_DISPLAY) {
			autoSessions = autoSessions.slice(
				autoSessions.length - MAX_SESSIONS_DISPLAY
			);
		}
		populateSessionList('autoSessions', autoSessions);
	});

	// Загрузка сессий, сохранённых при изменении вкладок
	chrome.storage.local.get(['changeSessions'], (result) => {
		let changeSessions = result.changeSessions || [];
		// Ограничиваем количество отображаемых сессий
		if (changeSessions.length > MAX_SESSIONS_DISPLAY) {
			changeSessions = changeSessions.slice(
				changeSessions.length - MAX_SESSIONS_DISPLAY
			);
		}
		populateSessionList('changeSessions', changeSessions);
	});
}

// Функция для заполнения списка сессий
function populateSessionList(elementId, sessions) {
	const sessionList = document.getElementById(elementId);
	sessionList.innerHTML = `<h2>${
		elementId === 'autoSessions'
			? 'Automatic Sessions'
			: 'Change-Triggered Sessions'
	}</h2>`;

	if (sessions.length === 0) {
		sessionList.innerHTML += '<p>No sessions available</p>';
		return;
	}

	const fragment = document.createDocumentFragment();

	sessions.forEach((session, index) => {
		const sessionItem = document.createElement('div');
		sessionItem.className = 'session-item';
		sessionItem.innerHTML = `
            <div class="session-header">
                <span>${formatTimestamp(session.timestamp)}</span>
                <button class="button-small view-btn" data-index="${index}" data-type="${
			elementId === 'autoSessions' ? 'autoSessions' : 'changeSessions'
		}">View</button>
            </div>
            <div class="session-details" style="display: none;"></div>
        `;
		fragment.appendChild(sessionItem);
	});

	sessionList.appendChild(fragment);
}

// Функция для просмотра и скрытия деталей сессии
function viewSessionDetails(sessionIndex, sessionType, button) {
	chrome.storage.local.get([sessionType], (result) => {
		const sessions = result[sessionType] || [];
		const session = sessions[sessionIndex];

		if (!session) {
			console.error('Session not found:', sessionIndex, sessionType);
			showNotification('Error', 'Session not found.');
			return;
		}

		const detailsDiv = button.parentElement.nextElementSibling;
		if (detailsDiv.style.display === 'block') {
			detailsDiv.style.display = 'none';
			button.textContent = 'View';
			return;
		}

		detailsDiv.innerHTML = ''; // Очищаем детали

		session.windows.forEach((window, index) => {
			const windowItem = document.createElement('div');
			windowItem.className = 'window-item';
			windowItem.innerHTML = `
                <p>Window ${index + 1} (${window.tabs.length} tabs)</p>
                <ul>
                    ${window.tabs.map((tab) => `<li>${tab}</li>`).join('')}
                </ul>
                <button class="button-small restore-btn" data-window-index="${index}" data-session-type="${sessionType}">Restore this Window</button>
            `;
			detailsDiv.appendChild(windowItem);
		});

		const restoreAllButton = document.createElement('button');
		restoreAllButton.className = 'button';
		restoreAllButton.textContent = 'Restore All Windows';
		restoreAllButton.onclick = () => restoreAllWindows(session.windows);
		detailsDiv.appendChild(restoreAllButton);

		detailsDiv.style.display = 'block';
		button.textContent = 'Hide';
	});
}

// Функция для восстановления отдельного окна
function restoreWindow(tabs) {
	chrome.windows.create({}, (newWindow) => {
		chrome.tabs.query({ windowId: newWindow.id }, (tabsInWindow) => {
			if (tabsInWindow.length > 0) {
				chrome.tabs.remove(tabsInWindow[0].id); // Закрываем пустую вкладку
			}
			tabs.forEach((url, index) => {
				setTimeout(() => {
					chrome.tabs.create({ windowId: newWindow.id, url });
				}, index * 500); // Открываем каждую вкладку с задержкой
			});
		});
	});
}

// Функция для восстановления всех окон
function restoreAllWindows(windows) {
	windows.forEach((window, windowIndex) => {
		setTimeout(() => {
			restoreWindow(window.tabs);
		}, windowIndex * 900); // Восстанавливаем каждое окно с задержкой
	});
}

// Функция для отображения уведомлений пользователю
function showNotification(title, message) {
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
					console.error('Notification Error:', chrome.runtime.lastError);
				} else {
					console.log('Notification shown with ID:', notificationId);
				}
			}
		);
	} else {
		alert(`${title}: ${message}`);
	}
}

// Делегирование событий для кнопок "View" и "Restore"
document.addEventListener('click', (e) => {
	if (e.target.classList.contains('view-btn')) {
		const sessionIndex = e.target.getAttribute('data-index');
		const sessionType = e.target.getAttribute('data-type');
		viewSessionDetails(sessionIndex, sessionType, e.target);
	} else if (e.target.classList.contains('restore-btn')) {
		const windowIndex = e.target.getAttribute('data-window-index');
		const sessionType = e.target.getAttribute('data-session-type');
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			// Предполагается, что кнопка "Restore this Window" находится внутри конкретной сессии
			// Вам может понадобиться уточнить логику получения правильного окна
			// Для простоты здесь восстановим все окна из всех сессий
			sessions.forEach((session) => {
				if (session.windows[windowIndex]) {
					restoreWindow(session.windows[windowIndex].tabs);
				}
			});
		});
	}
});

// Обработчик кнопки "Save Current Session"
document.getElementById('saveBtn').addEventListener('click', () => {
	// Отправляем сообщение background скрипту для сохранения сессии
	chrome.runtime.sendMessage({ action: 'saveSessionManually' }, (response) => {
		if (response && response.status === 'success') {
			loadSessions(); // Обновляем список сессий
			showNotification('Success', 'Session saved successfully.');
		} else {
			showNotification('Error', 'Failed to save session.');
		}
	});
});

// Переключение темы, уведомлений и загрузка сессий
document.addEventListener('DOMContentLoaded', () => {
	const themeSwitch = document.getElementById('themeSwitch');
	const notificationSwitch = document.getElementById('notificationSwitch');
	const htmlElement = document.documentElement; // Получаем <html> элемент

	// Проверка сохраненной темы в локальном хранилище
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme === 'dark') {
		htmlElement.classList.add('dark-theme');
		themeSwitch.checked = true;
	}

	// Проверка сохраненного состояния уведомлений
	chrome.storage.local.get(['notificationsEnabled'], (result) => {
		let notificationsEnabled = result.notificationsEnabled;
		if (notificationsEnabled === undefined) {
			notificationsEnabled = true; // По умолчанию включены
			chrome.storage.local.set({ notificationsEnabled });
		}
		notificationSwitch.checked = notificationsEnabled;
	});

	// Обработчик переключения темы
	themeSwitch.addEventListener('change', () => {
		if (themeSwitch.checked) {
			htmlElement.classList.add('dark-theme');
			localStorage.setItem('theme', 'dark');
			console.log('Dark theme enabled');
		} else {
			htmlElement.classList.remove('dark-theme');
			localStorage.setItem('theme', 'light');
			console.log('Dark theme disabled');
		}
	});

	// Обработчик переключения уведомлений
	notificationSwitch.addEventListener('change', () => {
		const isEnabled = notificationSwitch.checked;
		chrome.storage.local.set({ notificationsEnabled: isEnabled }, () => {
			console.log(`Push notifications ${isEnabled ? 'enabled' : 'disabled'}`);
			showNotification(
				'Settings Updated',
				`Push notifications ${isEnabled ? 'enabled' : 'disabled'}.`
			);
		});
	});

	// Устанавливаем значение интервала из хранилища
	chrome.storage.local.get(['autoBackupInterval'], (result) => {
		let interval = result.autoBackupInterval;
		if (!interval || isNaN(interval) || interval < 1) {
			interval = 10; // по умолчанию 10 минут
		}
		document.getElementById('intervalInput').value = interval;
	});

	// Загрузка сессий
	loadSessions();
});

// Обработчик изменения поля ввода интервала
document.getElementById('intervalInput').addEventListener('change', () => {
	let intervalValue = document.getElementById('intervalInput').value;
	if (intervalValue && !isNaN(intervalValue) && intervalValue >= 1) {
		chrome.storage.local.set(
			{ autoBackupInterval: parseInt(intervalValue, 10) },
			() => {
				console.log('Auto-save interval updated to', intervalValue, 'minutes');
				showNotification(
					'Settings Updated',
					`Auto backup interval set to ${intervalValue} minutes.`
				);
			}
		);
	} else {
		// Сброс к значению по умолчанию, если введено неверное значение
		document.getElementById('intervalInput').value = 10;
		chrome.storage.local.set({ autoBackupInterval: 10 }, () => {
			console.log('Auto-save interval reset to default (10 minutes)');
			showNotification(
				'Settings Updated',
				'Auto backup interval reset to default (10 minutes).'
			);
		});
	}
});
