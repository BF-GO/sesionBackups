// popup.js

const MAX_SESSIONS = 5; // Максимальное количество сессий

document.addEventListener('DOMContentLoaded', () => {
	const contentContainer = document.getElementById('contentContainer');
	const mainContentTemplate = document.getElementById('mainContentTemplate');
	const settingsTemplate = document.getElementById('settingsTemplate');
	const htmlElement = document.documentElement; // Для доступа к корневому элементу

	// Применяем сохранённую тему при загрузке
	chrome.storage.local.get(['theme'], (result) => {
		const savedTheme = result.theme || 'light';
		if (savedTheme === 'dark') {
			htmlElement.classList.add('dark-theme');
		} else {
			htmlElement.classList.remove('dark-theme');
		}
	});

	// Функция для загрузки основного содержимого
	function loadMainContent() {
		contentContainer.innerHTML = '';
		contentContainer.appendChild(mainContentTemplate.content.cloneNode(true));
		attachMainContentEventListeners();
		loadSessions();
	}

	// Функция для загрузки настроек
	function loadSettingsContent() {
		contentContainer.innerHTML = '';
		contentContainer.appendChild(settingsTemplate.content.cloneNode(true));
		attachSettingsEventListeners();
	}

	// Присоединяем обработчики событий для основного содержимого
	function attachMainContentEventListeners() {
		const settingsIcon = document.getElementById('settingsIcon');
		const saveBtn = document.getElementById('saveBtn');

		settingsIcon.addEventListener('click', loadSettingsContent);

		saveBtn.addEventListener('click', () => {
			chrome.runtime.sendMessage(
				{ action: 'saveSessionManually' },
				(response) => {
					if (response && response.status === 'success') {
						loadSessions();
						showNotification('Success', 'Session saved successfully.');
					} else {
						showNotification('Error', 'Failed to save session.');
					}
				}
			);
		});

		// Обработчики для элементов сессий
		attachSessionEventListeners();
	}

	// Присоединяем обработчики событий для настроек
	function attachSettingsEventListeners() {
		const backBtn = document.getElementById('backBtn');
		const themeSwitch = document.getElementById('themeSwitch');
		const notificationSwitch = document.getElementById('notificationSwitch');
		const intervalInput = document.getElementById('intervalInput');
		const importBtn = document.getElementById('importBtn');
		const importFileInput = document.getElementById('importFileInput');

		backBtn.addEventListener('click', loadMainContent);

		// Инициализируем значения настроек
		initializeSettings(themeSwitch, notificationSwitch, intervalInput);

		// Обработчики для переключателей настроек
		themeSwitch.addEventListener('change', () => {
			if (themeSwitch.checked) {
				htmlElement.classList.add('dark-theme');
				chrome.storage.local.set({ theme: 'dark' });
			} else {
				htmlElement.classList.remove('dark-theme');
				chrome.storage.local.set({ theme: 'light' });
			}
		});

		notificationSwitch.addEventListener('change', () => {
			const isEnabled = notificationSwitch.checked;
			chrome.storage.local.set({ notificationsEnabled: isEnabled }, () => {
				showNotification(
					'Settings Updated',
					`Push notifications ${isEnabled ? 'enabled' : 'disabled'}.`
				);
			});
		});

		intervalInput.addEventListener('change', () => {
			let intervalValue = parseInt(intervalInput.value, 10);
			if (intervalValue >= 1) {
				chrome.storage.local.set({ autoBackupInterval: intervalValue }, () => {
					showNotification(
						'Settings Updated',
						`Auto backup interval set to ${intervalValue} minutes.`
					);
				});
			} else {
				intervalInput.value = 10;
				chrome.storage.local.set({ autoBackupInterval: 10 }, () => {
					showNotification(
						'Settings Updated',
						'Auto backup interval reset to default (10 minutes).'
					);
				});
			}
		});

		// Обработчик для кнопки импорта
		importBtn.addEventListener('click', () => {
			importFileInput.click();
		});

		// Обработчик для выбора файла импорта
		importFileInput.addEventListener('change', handleImportFile);
	}

	// Инициализация настроек из хранилища
	function initializeSettings(themeSwitch, notificationSwitch, intervalInput) {
		// Тема
		chrome.storage.local.get(['theme'], (result) => {
			const savedTheme = result.theme || 'light';
			if (savedTheme === 'dark') {
				htmlElement.classList.add('dark-theme');
				themeSwitch.checked = true;
			} else {
				htmlElement.classList.remove('dark-theme');
				themeSwitch.checked = false;
			}
		});

		// Уведомления
		chrome.storage.local.get(['notificationsEnabled'], (result) => {
			const notificationsEnabled = result.notificationsEnabled !== false;
			notificationSwitch.checked = notificationsEnabled;
		});

		// Интервал
		chrome.storage.local.get(['autoBackupInterval'], (result) => {
			const interval = result.autoBackupInterval || 10;
			intervalInput.value = interval;
		});
	}

	// Функция для загрузки сессий
	function loadSessions() {
		// Загрузка автоматических сессий
		chrome.storage.local.get(['autoSessions'], (result) => {
			let autoSessions = result.autoSessions || [];
			populateSessionList('autoSessions', autoSessions);
		});

		// Загрузка сессий, сохранённых при изменении вкладок
		chrome.storage.local.get(['changeSessions'], (result) => {
			let changeSessions = result.changeSessions || [];
			populateSessionList('changeSessions', changeSessions);
		});
	}

	// Функция для заполнения списка сессий
	function populateSessionList(elementId, sessions) {
		const sessionList = document.getElementById(elementId);
		if (!sessionList) {
			console.error(`Element with id "${elementId}" not found.`);
			return;
		}
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
          <div>
            <button class="button-small view-btn" data-index="${index}" data-type="${elementId}">View</button>
            <button class="button-small export-btn" data-index="${index}" data-type="${elementId}">Export</button>
            <button class="button-small delete-btn" data-index="${index}" data-type="${elementId}">Delete</button>
          </div>
        </div>
        <div class="session-details" style="display: none;"></div>
      `;
			fragment.appendChild(sessionItem);
		});

		sessionList.appendChild(fragment);
	}

	// Единственная функция для форматирования временной метки
	function formatTimestamp(timestamp) {
		const date = new Date(timestamp);

		if (isNaN(date.getTime())) {
			console.error('Invalid date detected:', timestamp);
			return 'Invalid date';
		}

		return date.toLocaleString('ru-RU', {
			timeZone: 'Europe/Helsinki',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	// Присоединяем обработчики событий для элементов сессий
	function attachSessionEventListeners() {
		contentContainer.addEventListener('click', handleSessionClick);
	}

	// Обработчик кликов по элементам сессий
	function handleSessionClick(e) {
		if (e.target.classList.contains('view-btn')) {
			const sessionIndex = e.target.getAttribute('data-index');
			const sessionType = e.target.getAttribute('data-type');
			viewSessionDetails(sessionIndex, sessionType, e.target);
		} else if (e.target.classList.contains('restore-btn')) {
			const windowIndex = e.target.getAttribute('data-window-index');
			const sessionType = e.target.getAttribute('data-session-type');
			const sessionIndex = e.target.getAttribute('data-session-index');
			restoreWindowFromSession(windowIndex, sessionType, sessionIndex);
		} else if (e.target.classList.contains('toggle-tabs-btn')) {
			const tabsContainer = e.target.nextElementSibling;
			if (tabsContainer.style.display === 'block') {
				tabsContainer.style.display = 'none';
				e.target.textContent = 'Show Tabs';
			} else {
				tabsContainer.style.display = 'block';
				e.target.textContent = 'Hide Tabs';
			}
		} else if (e.target.classList.contains('delete-btn')) {
			const sessionIndex = e.target.getAttribute('data-index');
			const sessionType = e.target.getAttribute('data-type');
			deleteSession(sessionIndex, sessionType);
		} else if (e.target.classList.contains('export-btn')) {
			const sessionIndex = e.target.getAttribute('data-index');
			const sessionType = e.target.getAttribute('data-type');
			exportSession(sessionIndex, sessionType);
		}
	}

	// Функция для отображения деталей сессии
	function viewSessionDetails(sessionIndex, sessionType, button) {
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];

			if (!session) {
				console.error('Session not found:', sessionIndex, sessionType);
				showNotification('Error', 'Session not found.');
				return;
			}

			const detailsDiv = button.parentElement.parentElement.nextElementSibling;
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
          <button class="button-small toggle-tabs-btn">Show Tabs</button>
          <div class="tabs-container" style="display: none;">
            <ul>
              ${window.tabs
								.map(
									(tab) =>
										`<li><a href="${
											tab.url
										}" target="_blank" title="${escapeHtml(
											tab.title
										)}">${escapeHtml(tab.title)}</a></li>`
								)
								.join('')}
            </ul>
            <button class="button-small restore-btn" data-window-index="${index}" data-session-type="${sessionType}" data-session-index="${sessionIndex}">Restore this Window</button>
          </div>
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

	// Функция для удаления сессии
	function deleteSession(sessionIndex, sessionType) {
		chrome.storage.local.get([sessionType], (result) => {
			let sessions = result[sessionType] || [];
			sessions.splice(sessionIndex, 1);
			chrome.storage.local.set({ [sessionType]: sessions }, () => {
				if (chrome.runtime.lastError) {
					console.error('Error deleting session:', chrome.runtime.lastError);
					showNotification('Error', 'Failed to delete session.');
				} else {
					loadSessions();
					showNotification('Success', 'Session deleted successfully.');
				}
			});
		});
	}

	// Функция для экспорта выбранной сессии
	function exportSession(sessionIndex, sessionType) {
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];

			if (!session) {
				console.error('Session not found:', sessionIndex, sessionType);
				showNotification('Error', 'Session not found.');
				return;
			}

			const data = {
				[sessionType]: [session],
			};

			const jsonStr = JSON.stringify(data, null, 2);
			const blob = new Blob([jsonStr], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const downloadLink = document.createElement('a');
			downloadLink.href = url;
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			downloadLink.download = `session_${timestamp}.json`;
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);
			URL.revokeObjectURL(url);
			showNotification('Export', 'Session has been exported successfully.');
		});
	}

	// Функция для восстановления окна из сессии
	function restoreWindowFromSession(windowIndex, sessionType, sessionIndex) {
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];

			if (session && session.windows[windowIndex]) {
				restoreWindow(session.windows[windowIndex].tabs);
			} else {
				console.error('No matching session found for restoration.');
				showNotification('Error', 'No matching session found.');
			}
		});
	}

	// Функция для восстановления отдельного окна
	function restoreWindow(tabs) {
		if (tabs.length === 0) return; // Проверяем, есть ли вкладки для восстановления

		const firstTab = tabs[0].url;
		const otherTabs = tabs.slice(1).map((tab) => tab.url);

		// Создаём новое окно с первой вкладкой
		chrome.windows.create({ url: firstTab, state: 'normal' }, (newWindow) => {
			if (!newWindow || !newWindow.id) {
				console.error('Failed to create new window.');
				showNotification('Error', 'Failed to create new window.');
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
		});
	}

	// Функция для экранирования HTML-сущностей
	function escapeHtml(text) {
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		};
		return text.replace(/[&<>"']/g, function (m) {
			return map[m];
		});
	}

	// Функция для обработки файла импорта
	function handleImportFile(event) {
		const file = event.target.files[0];
		if (!file) {
			showNotification('Import', 'No file selected.');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const importedData = JSON.parse(e.target.result);

				// Проверка структуры данных
				if (
					(!importedData.autoSessions ||
						!Array.isArray(importedData.autoSessions)) &&
					(!importedData.changeSessions ||
						!Array.isArray(importedData.changeSessions))
				) {
					throw new Error('Invalid session data format.');
				}

				// Объединение существующих сессий с импортированными
				chrome.storage.local.get(
					['autoSessions', 'changeSessions'],
					(result) => {
						let existingAuto = result.autoSessions || [];
						let existingChange = result.changeSessions || [];

						// Импортируем autoSessions, если они есть
						if (
							importedData.autoSessions &&
							Array.isArray(importedData.autoSessions)
						) {
							existingAuto = [...existingAuto, ...importedData.autoSessions];
							// Ограничение до MAX_SESSIONS
							if (existingAuto.length > MAX_SESSIONS) {
								existingAuto = existingAuto.slice(
									existingAuto.length - MAX_SESSIONS
								);
							}
						}

						// Импортируем changeSessions, если они есть
						if (
							importedData.changeSessions &&
							Array.isArray(importedData.changeSessions)
						) {
							existingChange = [
								...existingChange,
								...importedData.changeSessions,
							];
							// Ограничение до MAX_SESSIONS
							if (existingChange.length > MAX_SESSIONS) {
								existingChange = existingChange.slice(
									existingChange.length - MAX_SESSIONS
								);
							}
						}

						chrome.storage.local.set(
							{
								autoSessions: existingAuto,
								changeSessions: existingChange,
							},
							() => {
								if (chrome.runtime.lastError) {
									console.error(
										'Error importing sessions:',
										chrome.runtime.lastError
									);
									showNotification(
										'Import Error',
										'Failed to import sessions.'
									);
								} else {
									loadMainContent(); // Перезагружаем главное содержимое и сессии
									showNotification(
										'Import',
										'Sessions have been imported successfully.'
									);
								}
							}
						);
					}
				);
			} catch (error) {
				console.error('Error parsing imported file:', error);
				showNotification('Import Error', 'Invalid file format.');
			}
		};
		reader.readAsText(file);
	}

	// Загружаем основное содержимое при запуске
	loadMainContent();
});
