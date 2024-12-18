// --- Обработчик события загрузки DOM ---
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

	// Делегирование событий для кнопок "Назад"
	document.addEventListener('click', (event) => {
		const backButton = event.target.closest('.back-button');
		if (backButton) {
			console.log('Back button clicked');
			loadTab('sessions');
		}
	});

	// --- Функция для загрузки содержимого вкладки ---
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
		contentContainer.innerHTML = ''; // Очищаем контейнер перед загрузкой новой вкладки
		let clone;
		switch (tabName) {
			case 'sessions':
				if (sessionsTabTemplate) {
					clone = sessionsTabTemplate.content.cloneNode(true);
					contentContainer.appendChild(clone);
					console.log('Loaded Sessions tab template');
					attachSessionsTabEventListeners();
					loadSessions(); // Вызов функции загрузки сессий
				} else {
					console.error('sessionsTabTemplate not found');
				}
				break;
			case 'statistics':
				if (statisticsTabTemplate) {
					clone = statisticsTabTemplate.content.cloneNode(true);
					contentContainer.appendChild(clone);
					console.log('Loaded Statistics tab template');
					attachStatisticsTabEventListeners();
					loadStatistics();
				} else {
					console.error('statisticsTabTemplate not found');
				}
				break;
			case 'schedule':
				if (scheduleTabTemplate) {
					clone = scheduleTabTemplate.content.cloneNode(true);
					contentContainer.appendChild(clone);
					console.log('Loaded Schedule tab template');
					attachScheduleTabEventListeners();
				} else {
					console.error('scheduleTabTemplate not found');
				}
				break;
			case 'settings':
				if (settingsTabTemplate) {
					clone = settingsTabTemplate.content.cloneNode(true);
					contentContainer.appendChild(clone);
					console.log('Loaded Settings tab template');
					attachSettingsTabEventListeners(); // Обновленная функция обработчиков настроек
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

	// --- Функция для вкладки "Настройки" ---
	function attachSettingsTabEventListeners() {
		const themeSwitch = document.getElementById('themeSwitch');
		const notificationSwitch = document.getElementById('notificationSwitch');
		const intervalInput = document.getElementById('intervalInput');
		const importBtn = document.getElementById('importBtn');
		const importFileInput = document.getElementById('importFileInput');
		const exportBtn = document.getElementById('exportBtn');

		// Обработчики переключателей Ручных Сессий
		const manualSessionsEnabledSwitch = document.getElementById(
			'manualSessionsEnabledSwitch'
		);
		const manualSessionsMaxInput = document.getElementById(
			'manualSessionsMaxInput'
		);

		if (manualSessionsEnabledSwitch) {
			manualSessionsEnabledSwitch.addEventListener('change', () => {
				const isEnabled = manualSessionsEnabledSwitch.checked;
				chrome.storage.local.set({ manualSessionsEnabled: isEnabled }, () => {
					console.log(`Manual sessions ${isEnabled ? 'enabled' : 'disabled'}`);
					showNotification(
						'Настройки Обновлены',
						`Ручные сессии ${isEnabled ? 'включены' : 'отключены'}.`
					);
					loadSessions(); // Перезагружаем сессии, чтобы отразить изменения
				});
			});
		}

		if (manualSessionsMaxInput) {
			manualSessionsMaxInput.addEventListener('change', () => {
				let maxValue = parseInt(manualSessionsMaxInput.value, 10);
				if (isNaN(maxValue) || maxValue < 0) {
					maxValue = 0;
				}
				chrome.storage.local.set({ manualSessionsMax: maxValue }, () => {
					console.log(`Manual sessions max set to: ${maxValue}`);
					showNotification(
						'Настройки Обновлены',
						`Максимальное количество ручных сессий установлено на ${maxValue}.`
					);
				});
			});
		}

		// Обработчики переключателей Авто Сессий
		const autoSessionsEnabledSwitch = document.getElementById(
			'autoSessionsEnabledSwitch'
		);
		const autoSessionsMaxInput = document.getElementById(
			'autoSessionsMaxInput'
		);

		if (autoSessionsEnabledSwitch) {
			autoSessionsEnabledSwitch.addEventListener('change', () => {
				const isEnabled = autoSessionsEnabledSwitch.checked;
				chrome.storage.local.set({ autoSessionsEnabled: isEnabled }, () => {
					console.log(`Auto sessions ${isEnabled ? 'enabled' : 'disabled'}`);
					showNotification(
						'Настройки Обновлены',
						`Авто сессии ${isEnabled ? 'включены' : 'отключены'}.`
					);
					loadSessions(); // Перезагружаем сессии, чтобы отразить изменения
				});
			});
		}

		if (autoSessionsMaxInput) {
			autoSessionsMaxInput.addEventListener('change', () => {
				let maxValue = parseInt(autoSessionsMaxInput.value, 10);
				if (isNaN(maxValue) || maxValue < 0) {
					maxValue = 0;
				}
				chrome.storage.local.set({ autoSessionsMax: maxValue }, () => {
					console.log(`Auto sessions max set to: ${maxValue}`);
					showNotification(
						'Настройки Обновлены',
						`Максимальное количество авто сессий установлено на ${maxValue}.`
					);
				});
			});
		}

		// Обработчики переключателей Сессий при Изменении Вкладок
		const changeSessionsEnabledSwitch = document.getElementById(
			'changeSessionsEnabledSwitch'
		);
		const changeSessionsMaxInput = document.getElementById(
			'changeSessionsMaxInput'
		);

		if (changeSessionsEnabledSwitch) {
			changeSessionsEnabledSwitch.addEventListener('change', () => {
				const isEnabled = changeSessionsEnabledSwitch.checked;
				chrome.storage.local.set({ changeSessionsEnabled: isEnabled }, () => {
					console.log(`Change sessions ${isEnabled ? 'enabled' : 'disabled'}`);
					showNotification(
						'Настройки Обновлены',
						`Сессии при изменении ${isEnabled ? 'включены' : 'отключены'}.`
					);
					loadSessions(); // Перезагружаем сессии, чтобы отразить изменения
				});
			});
		}

		if (changeSessionsMaxInput) {
			changeSessionsMaxInput.addEventListener('change', () => {
				let maxValue = parseInt(changeSessionsMaxInput.value, 10);
				if (isNaN(maxValue) || maxValue < 0) {
					maxValue = 0;
				}
				chrome.storage.local.set({ changeSessionsMax: maxValue }, () => {
					console.log(`Change sessions max set to: ${maxValue}`);
					showNotification(
						'Настройки Обновлены',
						`Максимальное количество сессий при изменении установлено на ${maxValue}.`
					);
				});
			});
		}

		// Обработчик переключателя Темы
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

		// Обработчик переключателя Уведомлений
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

		// Обработчик изменения Интервала Автобэкапа
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

		// Обработчики для кнопок Импорта и Экспорта
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

		// Инициализация значений настроек при загрузке вкладки "Настройки"
		initializeSettings(themeSwitch, notificationSwitch, intervalInput);
	}

	// --- Инициализация настроек ---
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

		// Настройки Ручных Сессий
		const manualSessionsEnabledSwitch = document.getElementById(
			'manualSessionsEnabledSwitch'
		);
		const manualSessionsMaxInput = document.getElementById(
			'manualSessionsMaxInput'
		);
		chrome.storage.local.get(
			['manualSessionsEnabled', 'manualSessionsMax'],
			(result) => {
				const manualSessionsEnabled = result.manualSessionsEnabled !== false;
				if (manualSessionsEnabledSwitch)
					manualSessionsEnabledSwitch.checked = manualSessionsEnabled;
				const manualSessionsMax = result.manualSessionsMax;
				if (manualSessionsMaxInput)
					manualSessionsMaxInput.value =
						manualSessionsMax !== undefined ? manualSessionsMax : 5;
			}
		);

		// Настройки Авто Сессий
		const autoSessionsEnabledSwitch = document.getElementById(
			'autoSessionsEnabledSwitch'
		);
		const autoSessionsMaxInput = document.getElementById(
			'autoSessionsMaxInput'
		);
		chrome.storage.local.get(
			['autoSessionsEnabled', 'autoSessionsMax'],
			(result) => {
				const autoSessionsEnabled = result.autoSessionsEnabled !== false;
				if (autoSessionsEnabledSwitch)
					autoSessionsEnabledSwitch.checked = autoSessionsEnabled;
				const autoSessionsMax = result.autoSessionsMax;
				if (autoSessionsMaxInput)
					autoSessionsMaxInput.value =
						autoSessionsMax !== undefined ? autoSessionsMax : 5;
			}
		);

		// Настройки Сессий при Изменении Вкладок
		const changeSessionsEnabledSwitch = document.getElementById(
			'changeSessionsEnabledSwitch'
		);
		const changeSessionsMaxInput = document.getElementById(
			'changeSessionsMaxInput'
		);
		chrome.storage.local.get(
			['changeSessionsEnabled', 'changeSessionsMax'],
			(result) => {
				const changeSessionsEnabled = result.changeSessionsEnabled !== false;
				if (changeSessionsEnabledSwitch)
					changeSessionsEnabledSwitch.checked = changeSessionsEnabled;
				const changeSessionsMax = result.changeSessionsMax;
				if (changeSessionsMaxInput)
					changeSessionsMaxInput.value =
						changeSessionsMax !== undefined ? changeSessionsMax : 5;
			}
		);
	}

	// --- Функции для вкладки "Сессии" ---

	// Функция для обновления типа группы
	function updateGroupType() {
		const groupSessionOption = document.getElementById('groupSessionOption');
		const groupCustomOption = document.getElementById('groupCustomOption');
		const sessionGroupOptions = document.getElementById('sessionGroupOptions');
		const customGroupOptions = document.getElementById('customGroupOptions');

		if (
			groupSessionOption &&
			groupCustomOption &&
			sessionGroupOptions &&
			customGroupOptions
		) {
			if (groupSessionOption.checked) {
				sessionGroupOptions.style.display = 'block';
				customGroupOptions.style.display = 'none';
			} else if (groupCustomOption.checked) {
				sessionGroupOptions.style.display = 'none';
				customGroupOptions.style.display = 'block';
			}
		}
	}

	// Функция для обновления типа планировки
	function updateScheduleType() {
		const scheduleSessionOption = document.getElementById(
			'scheduleSessionOption'
		);
		const scheduleCustomOption = document.getElementById(
			'scheduleCustomOption'
		);
		const sessionScheduleOptions = document.getElementById(
			'sessionScheduleOptions'
		);
		const customScheduleOptions = document.getElementById(
			'customScheduleOptions'
		);

		if (
			scheduleSessionOption &&
			scheduleCustomOption &&
			sessionScheduleOptions &&
			customScheduleOptions
		) {
			if (scheduleSessionOption.checked) {
				sessionScheduleOptions.style.display = 'block';
				customScheduleOptions.style.display = 'none';
			} else if (scheduleCustomOption.checked) {
				sessionScheduleOptions.style.display = 'none';
				customScheduleOptions.style.display = 'block';
			}
		}
	}

	// Функция для загрузки сессий в выпадающий список при создании группы
	function populateSessionsForGroupCreation() {
		const sessionSelectForGroup = document.getElementById(
			'sessionSelectForGroup'
		);
		if (!sessionSelectForGroup) return;

		// Очищаем существующие опции
		sessionSelectForGroup.innerHTML = '';

		// Загружаем сессии из хранилища
		chrome.storage.local.get(
			['autoSessions', 'changeSessions', 'manualSessions'],
			(result) => {
				const autoSessions = result.autoSessions || [];
				const changeSessions = result.changeSessions || [];
				const manualSessions = result.manualSessions || [];

				const allSessions = [
					...autoSessions.map((s, index) => ({
						...s,
						type: 'autoSessions',
						index,
					})),
					...changeSessions.map((s, index) => ({
						...s,
						type: 'changeSessions',
						index,
					})),
					...manualSessions.map((s, index) => ({
						...s,
						type: 'manualSessions',
						index,
					})),
				];

				allSessions.forEach((session) => {
					const option = document.createElement('option');
					option.value = `${session.type}_${session.index}`;
					option.textContent = `${
						session.type === 'autoSessions'
							? 'Авто'
							: session.type === 'changeSessions'
							? 'Изменение'
							: 'Ручная'
					} - ${formatTimestamp(session.timestamp)}`;
					sessionSelectForGroup.appendChild(option);
				});
			}
		);
	}

	// Функция для загрузки сессий в выпадающий список при планировании
	function loadSessionsForScheduling(sessionSelect) {
		// Загрузка сессий из хранилища
		chrome.storage.local.get(
			['autoSessions', 'changeSessions', 'manualSessions'],
			(result) => {
				const autoSessions = result.autoSessions || [];
				const changeSessions = result.changeSessions || [];
				const manualSessions = result.manualSessions || [];
				const allSessions = [
					...autoSessions.map((s, index) => ({
						...s,
						type: 'autoSessions',
						index,
					})),
					...changeSessions.map((s, index) => ({
						...s,
						type: 'changeSessions',
						index,
					})),
					...manualSessions.map((s, index) => ({
						...s,
						type: 'manualSessions',
						index,
					})),
				];

				sessionSelect.innerHTML = '';

				allSessions.forEach((session) => {
					const option = document.createElement('option');
					option.value = `${session.type}_${session.index}`;
					option.textContent = `${
						session.type === 'autoSessions'
							? 'Авто'
							: session.type === 'changeSessions'
							? 'Изменение'
							: 'Ручная'
					} - ${formatTimestamp(session.timestamp)}`;
					sessionSelect.appendChild(option);
				});
			}
		);
	}

	// Функция для загрузки сессий
	function loadSessions() {
		console.log('Loading sessions');
		// Получаем все необходимые данные одним вызовом
		chrome.storage.local.get(
			[
				'manualSessions',
				'autoSessions',
				'changeSessions',
				'groups',
				'manualSessionsEnabled',
				'autoSessionsEnabled',
				'changeSessionsEnabled',
			],
			(result) => {
				const manualSessionsEnabled = result.manualSessionsEnabled !== false;
				const autoSessionsEnabled = result.autoSessionsEnabled !== false;
				const changeSessionsEnabled = result.changeSessionsEnabled !== false;

				// Получаем ссылки на элементы DOM
				const manualSessionsDiv = document.getElementById('manualSessions');
				const autoSessionsDiv = document.getElementById('autoSessions');
				const changeSessionsDiv = document.getElementById('changeSessions');
				const customGroupsDiv = document.getElementById('customGroups');

				// Обрабатываем ручные сессии
				if (manualSessionsDiv) {
					if (manualSessionsEnabled) {
						manualSessionsDiv.style.display = 'block';
						const manualSessions = result.manualSessions || [];
						console.log(`Loaded manualSessions: ${manualSessions.length}`);
						populateSessionList('manualSessions', manualSessions);
					} else {
						manualSessionsDiv.style.display = 'none';
					}
				}

				// Обрабатываем автоматические сессии
				if (autoSessionsDiv) {
					if (autoSessionsEnabled) {
						autoSessionsDiv.style.display = 'block';
						const autoSessions = result.autoSessions || [];
						console.log(`Loaded autoSessions: ${autoSessions.length}`);
						populateSessionList('autoSessions', autoSessions);
					} else {
						autoSessionsDiv.style.display = 'none';
					}
				}

				// Обрабатываем сессии при изменении вкладок
				if (changeSessionsDiv) {
					if (changeSessionsEnabled) {
						changeSessionsDiv.style.display = 'block';
						const changeSessions = result.changeSessions || [];
						console.log(`Loaded changeSessions: ${changeSessions.length}`);
						populateSessionList('changeSessions', changeSessions);
					} else {
						changeSessionsDiv.style.display = 'none';
					}
				}

				// Обрабатываем пользовательские группы (предполагается, что они всегда отображаются)
				if (customGroupsDiv) {
					customGroupsDiv.style.display = 'block';
					const groups = result.groups || [];
					console.log(`Loaded groups: ${groups.length}`);
					populateSessionList('customGroups', groups);
				}

				// Загружаем группы и заполняем выпадающие списки
				loadGroups();
				populateSessionsForGroupCreation();
			}
		);
	}

	// Функция для заполнения списка сессий
	function populateSessionList(elementId, sessions) {
		const sessionList = document.getElementById(elementId);
		if (!sessionList) {
			console.error(`Element with id "${elementId}" not found.`);
			return;
		}

		let headerText = '';
		switch (elementId) {
			case 'autoSessions':
				headerText = 'Автоматические Сессии';
				break;
			case 'changeSessions':
				headerText = 'Сессии при Изменении Вкладок';
				break;
			case 'manualSessions':
				headerText = 'Ручные Сессии';
				break;
			case 'customGroups':
				headerText = 'Пользовательские Группы';
				break;
			default:
				headerText = 'Сессии';
		}

		sessionList.innerHTML = `<h3>${headerText}</h3>`;

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
									<span>${session.name || formatTimestamp(session.timestamp)}</span>
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
			timeZone: 'Europe/Moscow', // Обновлённая временная зона
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
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

	// --- Обработчики для вкладки "Сессии" ---
	function attachSessionsTabEventListeners() {
		// Обработчики кликов на сессии и группы
		contentContainer.addEventListener('click', handleSessionClick);

		// Обработчики для создания группы
		const createGroupBtn = document.getElementById('createGroupBtn');
		const createGroupForm = document.getElementById('createGroupForm');
		const saveGroupBtn = document.getElementById('saveGroupBtn');
		const cancelGroupBtn = document.getElementById('cancelGroupBtn');
		const addGroupUrlBtn = document.getElementById('addGroupUrlBtn');
		const groupSessionOption = document.getElementById('groupSessionOption');
		const groupCustomOption = document.getElementById('groupCustomOption');

		if (createGroupBtn) {
			createGroupBtn.addEventListener('click', () => {
				if (createGroupForm) {
					createGroupForm.style.display = 'block';
				}
			});
		}

		if (saveGroupBtn) {
			saveGroupBtn.addEventListener('click', saveGroup);
		}

		if (cancelGroupBtn) {
			cancelGroupBtn.addEventListener('click', () => {
				if (createGroupForm) {
					createGroupForm.style.display = 'none';
					resetCreateGroupForm();
				}
			});
		}

		if (addGroupUrlBtn) {
			addGroupUrlBtn.addEventListener('click', addCustomGroupUrlInput);
		}

		if (groupSessionOption) {
			groupSessionOption.addEventListener('change', updateGroupType);
		}

		if (groupCustomOption) {
			groupCustomOption.addEventListener('change', updateGroupType);
		}

		// Инициализируем видимость элементов на основе выбранного типа группы
		updateGroupType();

		// Добавляем обработчик для кнопки сохранения ручной сессии, если она существует
		const saveManualSessionBtn = document.getElementById('saveBtn');
		if (saveManualSessionBtn) {
			saveManualSessionBtn.addEventListener('click', () => {
				openSaveSessionDialog();
			});
		}
	}

	function handleSessionClick(e) {
		// Сессии
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

		// Группы
		if (e.target.classList.contains('view-group-btn')) {
			const groupIndex = e.target.getAttribute('data-index');
			console.log(`View group: Index=${groupIndex}`);
			viewGroupDetails(groupIndex, e.target);
		} else if (e.target.classList.contains('delete-group-btn')) {
			const groupIndex = e.target.getAttribute('data-index');
			console.log(`Delete group: Index=${groupIndex}`);
			deleteGroup(groupIndex);
		}
	}

	// --- Функция для отображения деталей группы ---
	function viewGroupDetails(groupIndex, button) {
		chrome.storage.local.get(
			['groups', 'autoSessions', 'changeSessions', 'manualSessions'],
			(result) => {
				const groups = result.groups || [];
				const group = groups[groupIndex];

				if (!group) {
					console.error('Group not found:', groupIndex);
					showNotification('Ошибка', 'Группа не найдена.');
					return;
				}

				const detailsDiv =
					button.parentElement.parentElement.nextElementSibling;
				if (detailsDiv.style.display === 'block') {
					detailsDiv.style.display = 'none';
					button.textContent = 'Просмотреть';
					detailsDiv.classList.remove('group-details'); // Удаляем класс при скрытии
					return;
				}

				detailsDiv.innerHTML = ''; // Очищаем предыдущие детали

				if (group.type === 'session') {
					// Отображаем сессии в группе
					const sessionList = document.createElement('ul');
					group.sessions.forEach((sessionId) => {
						const [sessionType, sessionIndex] = sessionId.split('_');
						const sessions = result[sessionType] || [];
						const session = sessions[sessionIndex];
						const li = document.createElement('li');
						if (session) {
							li.textContent = `${
								sessionType === 'autoSessions'
									? 'Авто'
									: sessionType === 'changeSessions'
									? 'Изменение'
									: 'Ручная'
							} - ${formatTimestamp(session.timestamp)}`;
						} else {
							li.textContent = 'Сессия не найдена';
						}
						sessionList.appendChild(li);
					});
					detailsDiv.appendChild(sessionList);
				} else if (group.type === 'custom') {
					// Отображаем кастомные ссылки
					const linkList = document.createElement('ul');
					group.customLinks.forEach((url) => {
						const li = document.createElement('li');
						li.innerHTML = `<a href="${url}" target="_blank">${escapeHtml(
							url
						)}</a>`;
						linkList.appendChild(li);
					});
					detailsDiv.appendChild(linkList);
				}

				const restoreGroupButton = document.createElement('button');
				restoreGroupButton.className = 'button';
				restoreGroupButton.textContent = 'Восстановить Группу';
				restoreGroupButton.onclick = () => restoreGroup(group);

				detailsDiv.appendChild(restoreGroupButton);

				detailsDiv.classList.add('group-details'); // Добавляем класс
				detailsDiv.style.display = 'block';
				button.textContent = 'Скрыть';
			}
		);
	}

	// --- Функция для восстановления группы ---
	function restoreGroup(group) {
		if (group.type === 'session') {
			// Восстанавливаем каждую сессию в группе
			group.sessions.forEach((sessionId) => {
				const [sessionType, sessionIndex] = sessionId.split('_');
				restoreSessionByTypeAndIndex(sessionType, sessionIndex);
			});
		} else if (group.type === 'custom') {
			// Открываем кастомные ссылки
			openCustomUrls(group.customLinks);
		}
	}

	// --- Функция для восстановления сессии по типу и индексу ---
	function restoreSessionByTypeAndIndex(sessionType, sessionIndex) {
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];
			if (session) {
				restoreAllWindows(session.windows);
			} else {
				console.error('Session not found:', sessionType, sessionIndex);
				showNotification('Ошибка', 'Сессия не найдена.');
			}
		});
	}

	// --- Функция для открытия кастомных URL ---
	function openCustomUrls(urls) {
		console.log(`Opening custom URLs: ${urls.length}`);
		urls.forEach((url) => {
			chrome.tabs.create({ url, active: false }, (tab) => {
				if (chrome.runtime.lastError) {
					console.error('Error opening URL:', chrome.runtime.lastError);
				}
			});
		});
	}

	// --- Функция для восстановления окна из сессии ---
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
				showNotification('Ошибка', 'Сессия не найдена.');
			}
		});
	}

	// --- Функция для восстановления отдельного окна ---
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

	// --- Функция для восстановления всех окон ---
	function restoreAllWindows(windows) {
		console.log(`Restoring all ${windows.length} windows`);
		windows.forEach((window, windowIndex) => {
			setTimeout(() => {
				restoreWindow(window.tabs);
			}, windowIndex * 900); // Восстанавливаем каждое окно с задержкой
		});
	}

	// --- Функция для удаления группы ---
	function deleteGroup(groupIndex) {
		chrome.storage.local.get(['groups'], (result) => {
			let groups = result.groups || [];
			groups.splice(groupIndex, 1);
			chrome.storage.local.set({ groups }, () => {
				if (chrome.runtime.lastError) {
					console.error('Error deleting group:', chrome.runtime.lastError);
					showNotification('Ошибка', 'Не удалось удалить группу.');
				} else {
					loadGroups();
					showNotification('Успех', 'Группа успешно удалена.');
				}
			});
		});
	}

	// --- Функция для сохранения группы ---
	function saveGroup() {
		const groupNameInput = document.getElementById('groupNameInput');
		const groupSessionOption = document.getElementById('groupSessionOption');
		const groupCustomOption = document.getElementById('groupCustomOption');
		const customGroupUrlsContainer = document.getElementById(
			'customGroupUrlsContainer'
		);

		if (!groupNameInput) return;
		const groupName = groupNameInput.value.trim();

		if (!groupName) {
			alert('Пожалуйста, введите название группы.');
			return;
		}

		const groupId = 'group_' + Date.now();

		if (groupSessionOption.checked) {
			const sessionSelectForGroup = document.getElementById(
				'sessionSelectForGroup'
			);
			if (!sessionSelectForGroup) return;
			const selectedOptions = Array.from(sessionSelectForGroup.selectedOptions);
			if (selectedOptions.length === 0) {
				alert('Пожалуйста, выберите хотя бы одну сессию.');
				return;
			}

			const sessions = selectedOptions.map((option) => option.value);

			const newGroup = {
				id: groupId,
				name: groupName,
				type: 'session',
				sessions: sessions,
			};

			saveGroupToStorage(newGroup);
		} else if (groupCustomOption.checked) {
			// Собираем все URL из динамических полей ввода
			const urlInputs =
				customGroupUrlsContainer.querySelectorAll('.customGroupUrl');
			const urls = Array.from(urlInputs)
				.map((input) => input.value.trim())
				.filter((url) => url);

			if (urls.length === 0) {
				alert('Пожалуйста, введите хотя бы одну ссылку.');
				return;
			}

			// Проверяем корректность URL
			const invalidUrls = urls.filter((url) => !isValidUrl(url));
			if (invalidUrls.length > 0) {
				alert('Найдены недействительные ссылки:\n' + invalidUrls.join('\n'));
				return;
			}

			const newGroup = {
				id: groupId,
				name: groupName,
				type: 'custom',
				customLinks: urls,
			};

			saveGroupToStorage(newGroup);
		}
	}

	// Функция для сохранения группы в хранилище
	function saveGroupToStorage(newGroup) {
		chrome.storage.local.get(['groups'], (result) => {
			let groups = result.groups || [];
			groups.push(newGroup);
			chrome.storage.local.set({ groups }, () => {
				if (chrome.runtime.lastError) {
					console.error('Error saving group:', chrome.runtime.lastError);
					showNotification('Ошибка', 'Не удалось сохранить группу.');
				} else {
					loadGroups(); // Перезагружаем список групп
					showNotification(
						'Группа Создана',
						`Группа "${newGroup.name}" успешно создана.`
					);
					// Скрываем форму создания группы
					const createGroupForm = document.getElementById('createGroupForm');
					if (createGroupForm) {
						createGroupForm.style.display = 'none';
					}
					resetCreateGroupForm();
				}
			});
		});
	}

	// Функция для сброса формы создания группы
	function resetCreateGroupForm() {
		const groupNameInput = document.getElementById('groupNameInput');
		const customGroupUrlsContainer = document.getElementById(
			'customGroupUrlsContainer'
		);
		const groupSessionOption = document.getElementById('groupSessionOption');
		const groupCustomOption = document.getElementById('groupCustomOption');

		if (groupNameInput) groupNameInput.value = '';
		if (customGroupUrlsContainer) {
			customGroupUrlsContainer.innerHTML = '';
			addCustomGroupUrlInput(); // Добавляем первоначальное поле ввода
		}
		if (groupSessionOption) groupSessionOption.checked = true;
		if (groupCustomOption) groupCustomOption.checked = false;
		updateGroupType();
	}

	// Функция для добавления нового поля ввода ссылки в группе
	function addCustomGroupUrlInput() {
		const customGroupUrlsContainer = document.getElementById(
			'customGroupUrlsContainer'
		);
		if (!customGroupUrlsContainer) return;

		const urlInputGroup = document.createElement('div');
		urlInputGroup.className = 'url-input-group';

		const newInput = document.createElement('input');
		newInput.type = 'url';
		newInput.className = 'customGroupUrl';
		newInput.placeholder = 'https://example.com';
		newInput.required = true;

		const removeBtn = document.createElement('button');
		removeBtn.type = 'button';
		removeBtn.className = 'button-small remove-url-btn';
		removeBtn.textContent = '−'; // Минус для удаления

		// Обработчик удаления поля ввода
		removeBtn.addEventListener('click', () => {
			customGroupUrlsContainer.removeChild(urlInputGroup);
		});

		urlInputGroup.appendChild(newInput);
		urlInputGroup.appendChild(removeBtn);

		customGroupUrlsContainer.appendChild(urlInputGroup);
	}

	// --- Функция для загрузки групп ---
	function loadGroups() {
		const customGroupsContainer = document.getElementById('customGroups');
		if (!customGroupsContainer) return;

		customGroupsContainer.innerHTML = '<h3>Пользовательские Группы</h3>';

		chrome.storage.local.get(['groups'], (result) => {
			const groups = result.groups || [];

			if (groups.length === 0) {
				customGroupsContainer.innerHTML += '<p>Нет доступных групп</p>';
				return;
			}

			const fragment = document.createDocumentFragment();

			groups.forEach((group, index) => {
				const groupItem = document.createElement('div');
				groupItem.className = 'session-item group-item'; // Добавляем класс group-item
				groupItem.innerHTML = `
									<div class="session-header">
											<span>${escapeHtml(group.name)}</span>
											<div>
													<button class="button-small view-group-btn" data-index="${index}">Просмотреть</button>
													<button class="button-small delete-group-btn" data-index="${index}">Удалить</button>
											</div>
									</div>
									<div class="session-details" style="display: none;"></div>
							`;
				fragment.appendChild(groupItem);
			});

			customGroupsContainer.appendChild(fragment);
		});
	}

	// --- Функция для восстановления сессии ---
	function restoreSessionFromSessionTypeAndIndex(sessionType, sessionIndex) {
		chrome.storage.local.get([sessionType], (result) => {
			const sessions = result[sessionType] || [];
			const session = sessions[sessionIndex];
			if (session) {
				restoreAllWindows(session.windows);
			} else {
				console.error('Session not found:', sessionType, sessionIndex);
				showNotification('Ошибка', 'Сессия не найдена.');
			}
		});
	}

	// --- Функция для удаления сессии ---
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

	// --- Функция для экспорта выбранной сессии ---
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

	// --- Функция для экспорта всех сессий ---
	function exportSessions() {
		console.log('Exporting all sessions');
		chrome.storage.local.get(
			['autoSessions', 'changeSessions', 'manualSessions'],
			(result) => {
				const data = {
					autoSessions: result.autoSessions || [],
					changeSessions: result.changeSessions || [],
					manualSessions: result.manualSessions || [],
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
			}
		);
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
					// Резервный вариант для браузеров без API уведомлений
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

	// --- Функция для проверки корректности URL ---
	function isValidUrl(string) {
		try {
			new URL(string);
			return true;
		} catch (_) {
			return false;
		}
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
						!Array.isArray(importedData.changeSessions)) &&
					(!importedData.manualSessions ||
						!Array.isArray(importedData.manualSessions))
				) {
					throw new Error('Неверный формат данных сессий.');
				}

				const MAX_SESSIONS = 50; // Задайте максимально допустимое количество сессий

				// Объединение существующих сессий с импортированными
				chrome.storage.local.get(
					['autoSessions', 'changeSessions', 'manualSessions'],
					(result) => {
						let existingAuto = result.autoSessions || [];
						let existingChange = result.changeSessions || [];
						let existingManual = result.manualSessions || [];

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

						// Импортируем manualSessions, если они есть
						if (
							importedData.manualSessions &&
							Array.isArray(importedData.manualSessions)
						) {
							existingManual = [
								...existingManual,
								...importedData.manualSessions,
							];
							// Ограничение до MAX_SESSIONS
							if (existingManual.length > MAX_SESSIONS) {
								existingManual = existingManual.slice(
									existingManual.length - MAX_SESSIONS
								);
							}
						}

						chrome.storage.local.set(
							{
								autoSessions: existingAuto,
								changeSessions: existingChange,
								manualSessions: existingManual,
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

	// --- Функция для сохранения сессии ---
	function saveManualSession(session) {
		chrome.storage.local.get(
			['manualSessions', 'manualSessionsMax', 'manualSessionsEnabled'],
			(result) => {
				if (result.manualSessionsEnabled === false) {
					console.log('Manual sessions are disabled.');
					showNotification('Ошибка', 'Ручные сессии отключены.');
					return;
				}
				let manualSessions = result.manualSessions || [];
				manualSessions.push(session);
				let manualSessionsMax = result.manualSessionsMax;
				if (manualSessionsMax === undefined || manualSessionsMax < 0) {
					manualSessionsMax = 5; // значение по умолчанию
				}
				// Ограничение до manualSessionsMax
				if (manualSessions.length > manualSessionsMax) {
					manualSessions = manualSessions.slice(
						manualSessions.length - manualSessionsMax
					);
				}
				chrome.storage.local.set({ manualSessions }, () => {
					if (chrome.runtime.lastError) {
						console.error(
							'Error saving manual session:',
							chrome.runtime.lastError
						);
						showNotification('Ошибка', 'Не удалось сохранить сессию.');
					} else {
						loadSessions();
						showNotification('Успех', 'Сессия успешно сохранена.');
					}
				});
			}
		);
	}

	// --- Функция для открытия диалога сохранения сессии ---
	function openSaveSessionDialog() {
		// Получаем список всех открытых окон и вкладок
		chrome.windows.getAll({ populate: true }, (windows) => {
			// Создаём диалоговое окно для выбора окон
			const dialog = document.createElement('div');
			dialog.className = 'save-session-dialog';

			dialog.innerHTML = `
							<div class="dialog-content">
									<h2>Сохранить Сессию</h2>
									<label for="sessionNameInput">Название сессии:</label>
									<input type="text" id="sessionNameInput" placeholder="Введите название сессии" />

									<p>Выберите окна для сохранения:</p>
									<div id="windowSelectionContainer">
											${windows
												.map(
													(window, index) => `
													<label>
															<input type="checkbox" class="window-checkbox" value="${window.id}" checked />
															Окно ${index + 1} (${window.tabs.length} вкладок)
													</label>
											`
												)
												.join('')}
									</div>

									<button id="saveSessionConfirmBtn" class="button">Сохранить</button>
									<button id="cancelSessionBtn" class="button">Отмена</button>
							</div>
					`;

			// Затемнение фона
			const overlay = document.createElement('div');
			overlay.className = 'dialog-overlay';
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			// Обработчики для кнопок диалога
			document
				.getElementById('saveSessionConfirmBtn')
				.addEventListener('click', () => {
					const sessionNameInput = document.getElementById('sessionNameInput');
					const sessionName = sessionNameInput.value.trim();
					if (!sessionName) {
						alert('Пожалуйста, введите название сессии.');
						return;
					}

					const selectedWindowIds = Array.from(
						document.querySelectorAll('.window-checkbox:checked')
					).map((checkbox) => parseInt(checkbox.value));

					if (selectedWindowIds.length === 0) {
						alert('Пожалуйста, выберите хотя бы одно окно для сохранения.');
						return;
					}

					// Фильтруем выбранные окна
					const selectedWindows = windows.filter((window) =>
						selectedWindowIds.includes(window.id)
					);

					// Формируем объект сессии
					const session = {
						id: 'manual_' + Date.now(),
						name: sessionName,
						timestamp: Date.now(),
						windows: selectedWindows.map((window) => ({
							tabs: window.tabs.map((tab) => ({
								title: tab.title,
								url: tab.url,
							})),
						})),
					};

					// Сохраняем сессию
					saveManualSession(session);

					// Удаляем диалог
					document.body.removeChild(overlay);
				});

			document
				.getElementById('cancelSessionBtn')
				.addEventListener('click', () => {
					// Удаляем диалог
					document.body.removeChild(overlay);
				});
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
		chrome.storage.local.get(
			['autoSessions', 'changeSessions', 'manualSessions'],
			(result) => {
				const autoSessions = result.autoSessions || [];
				const changeSessions = result.changeSessions || [];
				const manualSessions = result.manualSessions || [];
				const allSessions = [
					...autoSessions,
					...changeSessions,
					...manualSessions,
				];
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
			}
		);
	}

	// --- Обработчики для вкладки "Планирование" ---
	function attachScheduleTabEventListeners() {
		console.log('Вкладка "Планирование" загружена.');

		const scheduleSessionOption = document.getElementById(
			'scheduleSessionOption'
		);
		const scheduleCustomOption = document.getElementById(
			'scheduleCustomOption'
		);
		const sessionScheduleOptions = document.getElementById(
			'sessionScheduleOptions'
		);
		const customScheduleOptions = document.getElementById(
			'customScheduleOptions'
		);
		const sessionSelect = document.getElementById('sessionSelect');
		const customUrlsContainer = document.getElementById('customUrlsContainer');
		const scheduleDateTimeInput = document.getElementById('scheduleDateTime');
		const addScheduleBtn = document.getElementById('addScheduleBtn');
		const scheduledSessionsList = document.getElementById(
			'scheduledSessionsList'
		);
		const addUrlBtn = document.getElementById('addUrlBtn');

		if (
			!sessionSelect ||
			!scheduleDateTimeInput ||
			!addScheduleBtn ||
			!scheduledSessionsList ||
			!scheduleSessionOption ||
			!scheduleCustomOption ||
			!sessionScheduleOptions ||
			!customScheduleOptions ||
			!customUrlsContainer ||
			!addUrlBtn
		) {
			console.error('One or more schedule elements not found');
			return;
		}

		// Обработчики для переключения типа планировки
		scheduleSessionOption.addEventListener('change', updateScheduleType);
		scheduleCustomOption.addEventListener('change', updateScheduleType);

		// Инициализируем видимость элементов на основе выбранного типа планировки
		updateScheduleType();

		// Загрузить сессии в выпадающий список
		loadSessionsForScheduling(sessionSelect);

		// Загрузить запланированные сессии
		loadScheduledSessions();

		// Обработчик для добавления новой планировки
		addScheduleBtn.addEventListener('click', () => {
			const scheduleDateTime = scheduleDateTimeInput.value;

			if (!scheduleDateTime) {
				alert('Пожалуйста, установите дату и время.');
				return;
			}

			const scheduleTime = new Date(scheduleDateTime);

			if (isNaN(scheduleTime.getTime())) {
				alert('Неверный формат даты и времени.');
				return;
			}

			if (scheduleTime <= new Date()) {
				alert('Выберите будущую дату и время.');
				return;
			}

			const scheduleId = 'schedule_' + Date.now();

			if (scheduleSessionOption.checked) {
				const selectedSessionId = sessionSelect.value;

				if (!selectedSessionId) {
					alert('Пожалуйста, выберите сессию.');
					return;
				}

				// Создаем новую запланированную сессию для восстановления
				const scheduledSession = {
					id: scheduleId,
					type: 'session', // Тип планировки
					sessionId: selectedSessionId,
					time: scheduleTime.toISOString(),
				};

				// Сохраняем запланированную сессию
				saveScheduledSession(scheduledSession);
			} else if (scheduleCustomOption.checked) {
				// Собираем все URL из динамических полей ввода
				const urlInputs = customUrlsContainer.querySelectorAll('.customUrl');
				const urls = Array.from(urlInputs)
					.map((input) => input.value.trim())
					.filter((url) => url);

				if (urls.length === 0) {
					alert('Пожалуйста, введите хотя бы одну ссылку.');
					return;
				}

				// Проверяем корректность URL
				const invalidUrls = urls.filter((url) => !isValidUrl(url));
				if (invalidUrls.length > 0) {
					alert('Найдены недействительные ссылки:\n' + invalidUrls.join('\n'));
					return;
				}

				// Создаем новую запланированную сессию для открытия кастомных ссылок
				const scheduledSession = {
					id: scheduleId,
					type: 'custom', // Тип планировки
					urls: urls,
					time: scheduleTime.toISOString(),
				};

				// Сохраняем запланированную сессию
				saveScheduledSession(scheduledSession);
			}
		});

		// Обработчик для добавления новых полей ввода ссылок
		addUrlBtn.addEventListener('click', () => {
			addCustomUrlInput();
		});

		// Функция для добавления нового поля ввода ссылки
		function addCustomUrlInput() {
			const urlInputGroup = document.createElement('div');
			urlInputGroup.className = 'url-input-group';

			const newInput = document.createElement('input');
			newInput.type = 'url';
			newInput.className = 'customUrl';
			newInput.placeholder = 'https://example.com';
			newInput.required = true;

			const removeBtn = document.createElement('button');
			removeBtn.type = 'button';
			removeBtn.className = 'button-small remove-url-btn';
			removeBtn.textContent = '−'; // Минус для удаления

			// Обработчик удаления поля ввода
			removeBtn.addEventListener('click', () => {
				customUrlsContainer.removeChild(urlInputGroup);
			});

			urlInputGroup.appendChild(newInput);
			urlInputGroup.appendChild(removeBtn);

			customUrlsContainer.appendChild(urlInputGroup);
		}
	}

	// Функция для сохранения запланированной сессии
	function saveScheduledSession(scheduledSession) {
		chrome.storage.local.get(['scheduledSessions'], (result) => {
			let scheduledSessions = result.scheduledSessions || [];
			scheduledSessions.push(scheduledSession);
			chrome.storage.local.set({ scheduledSessions }, () => {
				if (chrome.runtime.lastError) {
					console.error(
						'Error saving scheduled session:',
						chrome.runtime.lastError
					);
				} else {
					// Планируем будильник через background.js
					chrome.runtime.sendMessage(
						{ action: 'scheduleSession', scheduledSession },
						(response) => {
							if (response && response.status === 'success') {
								// Обновляем интерфейс
								loadScheduledSessions();
								showNotification('Планировка', 'Планировка успешно добавлена.');
							} else {
								showNotification('Ошибка', 'Не удалось добавить планировку.');
							}
						}
					);
				}
			});
		});
	}

	// Функция для загрузки запланированных сессий
	function loadScheduledSessions() {
		const scheduledSessionsList = document.getElementById(
			'scheduledSessionsList'
		);
		if (!scheduledSessionsList) return;

		chrome.storage.local.get(['scheduledSessions'], (result) => {
			const scheduledSessions = result.scheduledSessions || [];
			scheduledSessionsList.innerHTML = '';

			if (scheduledSessions.length === 0) {
				scheduledSessionsList.innerHTML = '<li>Нет запланированных сессий</li>';
				return;
			}

			scheduledSessions.forEach((scheduledSession) => {
				const listItem = document.createElement('li');
				const scheduleTime = formatTimestamp(scheduledSession.time);
				let description = '';

				if (scheduledSession.type === 'session') {
					description = `Сессия: ${scheduledSession.sessionId}`;
				} else if (scheduledSession.type === 'custom') {
					description = `Пользовательские ссылки (${scheduledSession.urls.length})`;
				}

				listItem.textContent = `${description}, Время: ${scheduleTime}`;

				// Добавляем кнопку отмены
				const cancelButton = document.createElement('button');
				cancelButton.textContent = 'Отменить';
				cancelButton.className = 'button-small';
				cancelButton.addEventListener('click', () => {
					// Отменяем запланированную сессию
					cancelScheduledSession(scheduledSession.id);
				});

				listItem.appendChild(cancelButton);
				scheduledSessionsList.appendChild(listItem);
			});
		});
	}

	// Функция для отмены запланированной сессии
	function cancelScheduledSession(scheduleId) {
		chrome.storage.local.get(['scheduledSessions'], (result) => {
			let scheduledSessions = result.scheduledSessions || [];
			scheduledSessions = scheduledSessions.filter((s) => s.id !== scheduleId);
			chrome.storage.local.set({ scheduledSessions }, () => {
				if (chrome.runtime.lastError) {
					console.error(
						'Error cancelling scheduled session:',
						chrome.runtime.lastError
					);
				} else {
					// Отменяем будильник через background.js
					chrome.runtime.sendMessage(
						{ action: 'cancelScheduledSession', scheduleId },
						(response) => {
							if (response && response.status === 'success') {
								// Обновляем интерфейс
								loadScheduledSessions();
								showNotification('Планировка', 'Планировка отменена.');
							} else {
								showNotification('Ошибка', 'Не удалось отменить планировку.');
							}
						}
					);
				}
			});
		});
	}

	// --- Функция для фильтрации сессий по запросу ---
	function filterSessions(query) {
		document.querySelectorAll('.session-item').forEach((item) => {
			const sessionHeader = item.querySelector('.session-header span');
			if (sessionHeader) {
				const name = sessionHeader.textContent.toLowerCase();
				if (name.includes(query.toLowerCase())) {
					item.style.display = 'flex'; // Используем 'flex', чтобы сохранить расположение
				} else {
					item.style.display = 'none';
				}
			}
		});
	}

	// --- Функция для сохранения группы ---
	// Уже определена выше

	// --- Остальные функции ---
	// Все остальные функции уже определены и не дублируются
});
