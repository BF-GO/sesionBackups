// popup.js

const MAX_SESSIONS = 5; // Максимальное количество сессий

document.addEventListener('DOMContentLoaded', () => {
	const contentContainer = document.getElementById('contentContainer');
	const sessionsTabTemplate = document.getElementById('sessionsTabTemplate');
	const statisticsTabTemplate = document.getElementById(
		'statisticsTabTemplate'
	);
	const scheduleTabTemplate = document.getElementById('scheduleTabTemplate');
	const settingsTabTemplate = document.getElementById('settingsTabTemplate');
	const htmlElement = document.documentElement; // Для доступа к корневому элементу

	// Применяем сохранённую тему при загрузке
	chrome.storage.local.get(['theme'], (result) => {
		const savedTheme = result.theme || 'light';
		console.log(`Saved theme: ${savedTheme}`);
		if (savedTheme === 'dark') {
			htmlElement.classList.add('dark-theme');
			const themeSwitch = document.getElementById('themeSwitch');
			if (themeSwitch) themeSwitch.checked = true;
		} else {
			htmlElement.classList.remove('dark-theme');
			const themeSwitch = document.getElementById('themeSwitch');
			if (themeSwitch) themeSwitch.checked = false;
		}
	});

	// Функция для загрузки содержимого вкладки
	function loadTab(tabName) {
		console.log(`Loading tab: ${tabName}`);
		// Убираем активные классы у всех кнопок вкладок
		document.querySelectorAll('.tab-button').forEach((button) => {
			button.classList.remove('active');
		});

		// Убираем активные классы у всех содержимых вкладок
		document.querySelectorAll('.tab-content').forEach((content) => {
			content.classList.remove('active');
		});

		// Добавляем активный класс к выбранной вкладке
		const activeTabButton = document.querySelector(
			`.tab-button[data-tab="${tabName}"]`
		);
		if (activeTabButton) activeTabButton.classList.add('active');

		// Загрузка соответствующего шаблона
		switch (tabName) {
			case 'sessions':
				contentContainer.innerHTML = '';
				if (sessionsTabTemplate) {
					const clone = sessionsTabTemplate.content.cloneNode(true);
					contentContainer.appendChild(clone);
					console.log('Loaded Sessions tab template');
					attachSessionsTabEventListeners();
					loadSessions();
				} else {
					console.error('sessionsTabTemplate not found');
				}
				break;
			case 'statistics':
				contentContainer.innerHTML = '';
				if (statisticsTabTemplate) {
					const clone = statisticsTabTemplate.content.cloneNode(true);
					contentContainer.appendChild(clone);
					console.log('Loaded Statistics tab template');
					attachStatisticsTabEventListeners();
					loadStatistics(); // Загружаем статистику
				} else {
					console.error('statisticsTabTemplate not found');
				}
				break;
			case 'schedule':
				contentContainer.innerHTML = '';
				if (scheduleTabTemplate) {
					const clone = scheduleTabTemplate.content.cloneNode(true);
					contentContainer.appendChild(clone);
					console.log('Loaded Schedule tab template');
					attachScheduleTabEventListeners();
				} else {
					console.error('scheduleTabTemplate not found');
				}
				break;
			case 'settings':
				contentContainer.innerHTML = '';
				if (settingsTabTemplate) {
					const clone = settingsTabTemplate.content.cloneNode(true);
					contentContainer.appendChild(clone);
					console.log('Loaded Settings tab template');
					attachSettingsTabEventListeners();
				} else {
					console.error('settingsTabTemplate not found');
				}
				break;
			default:
				console.warn(`Unknown tab: ${tabName}`);
				break;
		}

		// После добавления содержимого вкладки, добавляем класс 'active'
		const activeTabContent = contentContainer.querySelector('.tab-content');
		if (activeTabContent) {
			activeTabContent.classList.add('active');
			console.log(`Activated tab content: ${tabName}`);
		}
	}

	// Обработчики переключения вкладок
	document.querySelectorAll('.tab-button').forEach((button) => {
		button.addEventListener('click', () => {
			const tabName = button.getAttribute('data-tab');
			loadTab(tabName);
		});
	});

	// Функция для загрузки основной вкладки при запуске
	loadTab('sessions');

	// --- Функции для вкладки "Сессии" ---
	function attachSessionsTabEventListeners() {
		const saveBtn = document.getElementById('saveBtn');
		const createGroupBtn = document.getElementById('createGroupBtn');
		const searchInput = document.getElementById('searchInput');

		if (saveBtn) {
			saveBtn.addEventListener('click', () => {
				console.log('Save button clicked');
				chrome.runtime.sendMessage(
					{ action: 'saveSessionManually' },
					(response) => {
						console.log('Received response:', response);
						if (response && response.status === 'success') {
							loadSessions();
							showNotification('Успех', 'Сессия успешно сохранена.');
						} else {
							showNotification('Ошибка', 'Не удалось сохранить сессию.');
						}
					}
				);
			});
		}

		if (createGroupBtn) {
			createGroupBtn.addEventListener('click', () => {
				console.log('Create Group button clicked');
				const groupName = prompt('Введите название группы:');
				if (groupName) {
					showNotification(
						'Группа Создана',
						`Группа "${groupName}" успешно создана.`
					);
					// Здесь можно добавить логику создания группы
				}
			});
		}

		if (searchInput) {
			searchInput.addEventListener('input', () => {
				const query = searchInput.value.toLowerCase();
				console.log(`Search query: ${query}`);
				filterSessions(query);
			});
		}

		// Обработчики для элементов сессий
		attachSessionEventListeners();
	}

	// Фильтрация сессий по запросу
	function filterSessions(query) {
		document.querySelectorAll('.session-item').forEach((item) => {
			const sessionName = item
				.querySelector('.session-header span')
				.textContent.toLowerCase();
			if (sessionName.includes(query)) {
				item.style.display = 'block';
			} else {
				item.style.display = 'none';
			}
		});
	}

	// Функция для загрузки сессий
	function loadSessions() {
		console.log('Loading sessions');
		// Загрузка автоматических сессий
		chrome.storage.local.get(['autoSessions'], (result) => {
			let autoSessions = result.autoSessions || [];
			console.log(`Loaded autoSessions: ${autoSessions.length}`);
			populateSessionList('autoSessions', autoSessions);
		});

		// Загрузка сессий, сохранённых при изменении вкладок
		chrome.storage.local.get(['changeSessions'], (result) => {
			let changeSessions = result.changeSessions || [];
			console.log(`Loaded changeSessions: ${changeSessions.length}`);
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
				? 'Автоматические Сессии'
				: 'Сессии при Изменении Вкладок'
		}</h2>`;

		if (sessions.length === 0) {
			sessionList.innerHTML += '<p>Нет доступных сессий</p>';
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
                        <button class="button-small view-btn" data-index="${index}" data-type="${elementId}">Просмотреть</button>
                        <button class="button-small export-btn" data-index="${index}" data-type="${elementId}">Экспорт</button>
                        <button class="button-small delete-btn" data-index="${index}" data-type="${elementId}">Удалить</button>
                    </div>
                </div>
                <div class="session-details" style="display: none;"></div>
            `;
			fragment.appendChild(sessionItem);
		});

		sessionList.appendChild(fragment);
	}

	// Функция для форматирования временной метки
	function formatTimestamp(timestamp) {
		const date = new Date(timestamp);

		if (isNaN(date.getTime())) {
			console.error('Invalid date detected:', timestamp);
			return 'Неверная дата';
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
			console.log(`View session: Type=${sessionType}, Index=${sessionIndex}`);
			viewSessionDetails(sessionIndex, sessionType, e.target);
		} else if (e.target.classList.contains('restore-btn')) {
			const windowIndex = e.target.getAttribute('data-window-index');
			const sessionType = e.target.getAttribute('data-session-type');
			const sessionIndex = e.target.getAttribute('data-session-index');
			console.log(
				`Restore window: Type=${sessionType}, SessionIndex=${sessionIndex}, WindowIndex=${windowIndex}`
			);
			restoreWindowFromSession(windowIndex, sessionType, sessionIndex);
		} else if (e.target.classList.contains('toggle-tabs-btn')) {
			const tabsContainer = e.target.nextElementSibling;
			if (tabsContainer.style.display === 'block') {
				tabsContainer.style.display = 'none';
				e.target.textContent = 'Показать Вкладки';
			} else {
				tabsContainer.style.display = 'block';
				e.target.textContent = 'Скрыть Вкладки';
			}
		} else if (e.target.classList.contains('delete-btn')) {
			const sessionIndex = e.target.getAttribute('data-index');
			const sessionType = e.target.getAttribute('data-type');
			console.log(`Delete session: Type=${sessionType}, Index=${sessionIndex}`);
			deleteSession(sessionIndex, sessionType);
		} else if (e.target.classList.contains('export-btn')) {
			const sessionIndex = e.target.getAttribute('data-index');
			const sessionType = e.target.getAttribute('data-type');
			console.log(`Export session: Type=${sessionType}, Index=${sessionIndex}`);
			exportSession(sessionIndex, sessionType);
		}
	}

	// Функция для отображения деталей сессии
	function viewSessionDetails(sessionIndex, sessionType, button) {
		console.log(
			`Viewing session details: Type=${sessionType}, Index=${sessionIndex}`
		);
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];

			if (!session) {
				console.error('Session not found:', sessionIndex, sessionType);
				showNotification('Ошибка', 'Сессия не найдена.');
				return;
			}

			const detailsDiv = button.parentElement.parentElement.nextElementSibling;
			if (detailsDiv.style.display === 'block') {
				detailsDiv.style.display = 'none';
				button.textContent = 'Просмотреть';
				return;
			}

			detailsDiv.innerHTML = ''; // Очищаем детали

			session.windows.forEach((window, index) => {
				const windowItem = document.createElement('div');
				windowItem.className = 'window-item';
				windowItem.innerHTML = `
                    <p>Окно ${index + 1} (${window.tabs.length} вкладок)</p>
                    <button class="button-small toggle-tabs-btn">Показать Вкладки</button>
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
                        <button class="button-small restore-btn" data-window-index="${index}" data-session-type="${sessionType}" data-session-index="${sessionIndex}">Восстановить Это Окно</button>
                    </div>
                `;
				detailsDiv.appendChild(windowItem);
			});

			const restoreAllButton = document.createElement('button');
			restoreAllButton.className = 'button';
			restoreAllButton.textContent = 'Восстановить Все Окна';
			restoreAllButton.onclick = () => restoreAllWindows(session.windows);
			detailsDiv.appendChild(restoreAllButton);

			detailsDiv.style.display = 'block';
			button.textContent = 'Скрыть';
		});
	}

	// Функция для удаления сессии
	function deleteSession(sessionIndex, sessionType) {
		console.log(`Deleting session: Type=${sessionType}, Index=${sessionIndex}`);
		chrome.storage.local.get([sessionType], (result) => {
			let sessions = result[sessionType] || [];
			sessions.splice(sessionIndex, 1);
			chrome.storage.local.set({ [sessionType]: sessions }, () => {
				if (chrome.runtime.lastError) {
					console.error('Error deleting session:', chrome.runtime.lastError);
					showNotification('Ошибка', 'Не удалось удалить сессию.');
				} else {
					loadSessions();
					showNotification('Успех', 'Сессия успешно удалена.');
				}
			});
		});
	}

	// Функция для экспорта выбранной сессии
	function exportSession(sessionIndex, sessionType) {
		console.log(
			`Exporting session: Type=${sessionType}, Index=${sessionIndex}`
		);
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];

			if (!session) {
				console.error('Session not found:', sessionIndex, sessionType);
				showNotification('Ошибка', 'Сессия не найдена.');
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
			showNotification('Экспорт', 'Сессия успешно экспортирована.');
		});
	}

	// Функция для восстановления окна из сессии
	function restoreWindowFromSession(windowIndex, sessionType, sessionIndex) {
		console.log(
			`Restoring window: Type=${sessionType}, SessionIndex=${sessionIndex}, WindowIndex=${windowIndex}`
		);
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];

			if (session && session.windows[windowIndex]) {
				restoreWindow(session.windows[windowIndex].tabs);
			} else {
				console.error('No matching session found for restoration.');
				showNotification(
					'Ошибка',
					'Не найдена подходящая сессия для восстановления.'
				);
			}
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
				showNotification('Ошибка', 'Не удалось создать новое окно.');
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
		console.log(`Restoring all ${windows.length} windows`);
		windows.forEach((window, windowIndex) => {
			setTimeout(() => {
				restoreWindow(window.tabs);
			}, windowIndex * 900); // Восстанавливаем каждое окно с задержкой
		});
	}

	// --- Функции для вкладки "Статистика" ---
	function attachStatisticsTabEventListeners() {
		// Здесь можно добавить обработчики событий для статистики, если потребуется
		console.log('Вкладка "Статистика" загружена.');
	}

	function loadStatistics() {
		console.log('Loading statistics');
		// Пример загрузки статистики
		chrome.storage.local.get(['autoSessions', 'changeSessions'], (result) => {
			const autoSessions = result.autoSessions || [];
			const changeSessions = result.changeSessions || [];
			const allSessions = [...autoSessions, ...changeSessions];
			const totalSessions = allSessions.length;
			let totalTabs = 0;
			const siteCount = {};

			allSessions.forEach((session) => {
				session.windows.forEach((window) => {
					totalTabs += window.tabs.length;
					window.tabs.forEach((tab) => {
						try {
							const host = new URL(tab.url).hostname;
							siteCount[host] = (siteCount[host] || 0) + 1;
						} catch (e) {
							console.error('Invalid URL:', tab.url);
						}
					});
				});
			});

			// Находим самый частый сайт
			let mostFrequentSite = 'N/A';
			let maxCount = 0;
			for (const site in siteCount) {
				if (siteCount[site] > maxCount) {
					maxCount = siteCount[site];
					mostFrequentSite = site;
				}
			}

			// Обновляем элементы на странице
			const totalSessionsEl = document.getElementById('totalSessions');
			const totalTabsEl = document.getElementById('totalTabs');
			const mostFrequentSiteEl = document.getElementById('mostFrequentSite');

			if (totalSessionsEl) {
				totalSessionsEl.textContent = totalSessions;
				console.log(`Total Sessions: ${totalSessions}`);
			}
			if (totalTabsEl) {
				totalTabsEl.textContent = totalTabs;
				console.log(`Total Tabs: ${totalTabs}`);
			}
			if (mostFrequentSiteEl) {
				mostFrequentSiteEl.textContent = mostFrequentSite;
				console.log(`Most Frequent Site: ${mostFrequentSite}`);
			}
		});
	}

	// --- Функции для вкладки "Планирование" ---
	function attachScheduleTabEventListeners() {
		// Здесь можно добавить обработчики событий для планирования, если потребуется
		console.log('Вкладка "Планирование" загружена.');
		// Пример: можно добавить статическое содержимое или интерфейс для планирования
	}

	// --- Функции для вкладки "Настройки" ---
	function attachSettingsTabEventListeners() {
		const backBtn = document.getElementById('backBtn');
		const themeSwitch = document.getElementById('themeSwitch');
		const notificationSwitch = document.getElementById('notificationSwitch');
		const intervalInput = document.getElementById('intervalInput');
		const importBtn = document.getElementById('importBtn');
		const importFileInput = document.getElementById('importFileInput');
		const exportBtn = document.getElementById('exportBtn');

		// Обработчик для кнопки возврата (если необходимо)
		if (backBtn) {
			backBtn.addEventListener('click', () => {
				console.log('Back button clicked');
				loadTab('sessions');
			});
		}

		// Инициализируем значения настроек
		initializeSettings(themeSwitch, notificationSwitch, intervalInput);

		// Обработчики для переключателей настроек
		if (themeSwitch) {
			themeSwitch.addEventListener('change', () => {
				if (themeSwitch.checked) {
					htmlElement.classList.add('dark-theme');
					chrome.storage.local.set({ theme: 'dark' }, () => {
						console.log('Theme set to dark');
					});
				} else {
					htmlElement.classList.remove('dark-theme');
					chrome.storage.local.set({ theme: 'light' }, () => {
						console.log('Theme set to light');
					});
				}
			});
		}

		if (notificationSwitch) {
			notificationSwitch.addEventListener('change', () => {
				const isEnabled = notificationSwitch.checked;
				chrome.storage.local.set({ notificationsEnabled: isEnabled }, () => {
					console.log(`Notifications ${isEnabled ? 'enabled' : 'disabled'}`);
					showNotification(
						'Настройки Обновлены',
						`Push уведомления ${isEnabled ? 'включены' : 'отключены'}.`
					);
				});
			});
		}

		if (intervalInput) {
			intervalInput.addEventListener('change', () => {
				let intervalValue = parseInt(intervalInput.value, 10);
				console.log(`AutoBackup interval changed to: ${intervalValue}`);
				if (intervalValue >= 1) {
					chrome.storage.local.set(
						{ autoBackupInterval: intervalValue },
						() => {
							showNotification(
								'Настройки Обновлены',
								`Интервал автосохранения установлен на ${intervalValue} минут.`
							);
						}
					);
				} else {
					intervalInput.value = 10;
					chrome.storage.local.set({ autoBackupInterval: 10 }, () => {
						showNotification(
							'Настройки Обновлены',
							'Интервал автосохранения сброшен на значение по умолчанию (10 минут).'
						);
					});
				}
			});
		}

		if (importBtn && importFileInput) {
			// Обработчик для кнопки импорта
			importBtn.addEventListener('click', () => {
				console.log('Import button clicked');
				importFileInput.click();
			});

			// Обработчик для выбора файла импорта
			importFileInput.addEventListener('change', handleImportFile);
		}

		if (exportBtn) {
			// Обработчик для кнопки экспорта
			exportBtn.addEventListener('click', () => {
				console.log('Export button clicked');
				exportSessions();
			});
		}
	}

	// Инициализация настроек из хранилища
	function initializeSettings(themeSwitch, notificationSwitch, intervalInput) {
		// Тема
		chrome.storage.local.get(['theme'], (result) => {
			const savedTheme = result.theme || 'light';
			console.log(`Initializing theme: ${savedTheme}`);
			if (savedTheme === 'dark') {
				htmlElement.classList.add('dark-theme');
				if (themeSwitch) themeSwitch.checked = true;
			} else {
				htmlElement.classList.remove('dark-theme');
				if (themeSwitch) themeSwitch.checked = false;
			}
		});

		// Уведомления
		chrome.storage.local.get(['notificationsEnabled'], (result) => {
			const notificationsEnabled = result.notificationsEnabled !== false;
			if (notificationSwitch) notificationSwitch.checked = notificationsEnabled;
			console.log(`Initializing notifications: ${notificationsEnabled}`);
		});

		// Интервал
		chrome.storage.local.get(['autoBackupInterval'], (result) => {
			const interval = result.autoBackupInterval || 10;
			if (intervalInput) intervalInput.value = interval;
			console.log(`Initializing autoBackupInterval: ${interval}`);
		});
	}

	// --- Функции для экспорта всех сессий ---
	function exportSessions() {
		console.log('Exporting all sessions');
		chrome.storage.local.get(['autoSessions', 'changeSessions'], (result) => {
			const data = {
				autoSessions: result.autoSessions || [],
				changeSessions: result.changeSessions || [],
			};

			const jsonStr = JSON.stringify(data, null, 2);
			const blob = new Blob([jsonStr], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const downloadLink = document.createElement('a');
			downloadLink.href = url;
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			downloadLink.download = `sessions_${timestamp}.json`;
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);
			URL.revokeObjectURL(url);
			showNotification('Экспорт', 'Все сессии успешно экспортированы.');
		});
	}

	// --- Функция для отображения уведомлений ---
	function showNotification(title, message) {
		console.log(`Showing notification: ${title} - ${message}`);
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

	// --- Функция для экранирования HTML-сущностей ---
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

	// --- Функция для обработки файла импорта ---
	function handleImportFile(event) {
		const file = event.target.files[0];
		if (!file) {
			console.log('No file selected for import');
			showNotification('Импорт', 'Файл не выбран.');
			return;
		}

		console.log(`Importing file: ${file.name}`);
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const importedData = JSON.parse(e.target.result);
				console.log('Imported data:', importedData);

				// Проверка структуры данных
				if (
					(!importedData.autoSessions ||
						!Array.isArray(importedData.autoSessions)) &&
					(!importedData.changeSessions ||
						!Array.isArray(importedData.changeSessions))
				) {
					throw new Error('Неверный формат данных сессий.');
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
										'Ошибка Импорта',
										'Не удалось импортировать сессии.'
									);
								} else {
									loadTab('sessions'); // Перезагружаем вкладку "Сессии"
									showNotification('Импорт', 'Сессии успешно импортированы.');
								}
							}
						);
					}
				);
			} catch (error) {
				console.error('Error parsing imported file:', error);
				showNotification('Ошибка Импорта', 'Неверный формат файла.');
			}
		};
		reader.readAsText(file);
	}
});
