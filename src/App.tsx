import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const mainCode = `import sys
from PyQt5.QtCore import QUrl, Qt, QSize, pyqtSignal, QObject
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QLineEdit, QPushButton, QToolBar,
    QTabWidget, QWidget, QVBoxLayout, QHBoxLayout, QMenu, QAction,
    QStatusBar, QLabel, QComboBox, QInputDialog, QMessageBox,
    QToolButton, QFrame, QSplitter, QShortcut
)
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage
from PyQt5.QtGui import QKeySequence, QIcon, QFont, QPalette, QColor
from PyQt5.QtCore import QSettings


# ============================================================
# СИСТЕМА РАСШИРЕНИЙ
# ============================================================

class ExtensionManager:
    """Менеджер расширений для браузера"""

    def __init__(self):
        self.extensions = {}
        self.enabled_extensions = set()
        self.load_settings()

    def load_settings(self):
        """Загрузка настроек расширений"""
        settings = QSettings("MyBrowser", "Extensions")
        enabled = settings.value("enabled", [])
        if enabled:
            self.enabled_extensions = set(enabled)

    def save_settings(self):
        """Сохранение настроек расширений"""
        settings = QSettings("MyBrowser", "Extensions")
        settings.setValue("enabled", list(self.enabled_extensions))

    def register_extension(self, name, extension):
        """Регистрация нового расширения"""
        self.extensions[name] = extension

    def toggle_extension(self, name):
        """Включить/выключить расширение"""
        if name in self.enabled_extensions:
            self.enabled_extensions.remove(name)
        else:
            self.enabled_extensions.add(name)
        self.save_settings()

    def is_enabled(self, name):
        """Проверить, включено ли расширение"""
        return name in self.enabled_extensions

    def get_enabled_extensions(self):
        """Получить список включённых расширений"""
        return [self.extensions[name] for name in self.enabled_extensions
                if name in self.extensions]


class Extension:
    """Базовый класс для расширений"""

    def __init__(self, name, description, icon="🧩"):
        self.name = name
        self.description = description
        self.icon = icon
        self.enabled = False

    def on_page_loaded(self, page):
        """Вызывается при загрузке страницы"""
        pass

    def on_url_changed(self, url):
        """Вызывается при изменении URL"""
        pass

    def get_toolbar_widget(self):
        """Возвращает виджет для панели инструментов (или None)"""
        return None


# --- Встроенные расширения ---

class DarkModeExtension(Extension):
    """Принудительная тёмная тема для всех сайтов"""

    def __init__(self):
        super().__init__(
            "Тёмный режим",
            "Принудительно включает тёмную тему на всех сайтах",
            "🌙"
        )

    def on_page_loaded(self, page):
        dark_css = """
        html {
            filter: invert(0.85) hue-rotate(180deg) !important;
            background: #1a1a2e !important;
        }
        img, video, canvas, svg {
            filter: invert(1) hue-rotate(180deg) !important;
        }
        """
        page.runJavaScript(f"""
            var style = document.createElement('style');
            style.textContent = \`{dark_css}\`;
            document.head.appendChild(style);
        """)


class AdBlockerExtension(Extension):
    """Базовый блокировщик рекламы"""

    def __init__(self):
        super().__init__(
            "Блокировщик рекламы",
            "Блокирует всплывающие окна и баннеры",
            "🛡️"
        )
        self.blocked_count = 0

    def on_page_loaded(self, page):
        ad_block_js = """
        // Удаление всплывающих окон
        window.open = function() { return null; };

        // Удаление рекламных элементов
        var adSelectors = [
            '[class*="ad-"]', '[class*="ads-"]', '[id*="ad-"]',
            '[class*="banner"]', '[id*="banner"]',
            '[class*="popup"]', '[id*="popup"]',
            '.advertisement', '.ad-container', '.adsbygoogle'
        ];
        adSelectors.forEach(function(sel) {
            document.querySelectorAll(sel).forEach(function(el) {
                el.remove();
            });
        });
        """
        page.runJavaScript(ad_block_js)


class ReaderModeExtension(Extension):
    """Режим чтения — убирает всё лишнее"""

    def __init__(self):
        super().__init__(
            "Режим чтения",
            "Убирает всё лишнее, оставляя только текст",
            "📖"
        )

    def get_toolbar_widget(self):
        btn = QPushButton("📖")
        btn.setToolTip("Режим чтения")
        btn.setStyleSheet("""
            QPushButton {
                background: transparent;
                border: none;
                font-size: 18px;
                padding: 5px;
            }
            QPushButton:hover {
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
            }
        """)
        return btn


class BookmarkExtension(Extension):
    """Менеджер закладок"""

    def __init__(self):
        super().__init__(
            "Закладки",
            "Быстрое добавление и управление закладками",
            "⭐"
        )
        self.bookmarks = []
        self.load_bookmarks()

    def load_bookmarks(self):
        settings = QSettings("MyBrowser", "Bookmarks")
        size = settings.beginReadArray("bookmarks")
        for i in range(size):
            settings.setArrayIndex(i)
            self.bookmarks.append({
                "title": settings.value("title"),
                "url": settings.value("url")
            })
        settings.endArray()

    def save_bookmarks(self):
        settings = QSettings("MyBrowser", "Bookmarks")
        settings.beginWriteArray("bookmarks")
        for i, bm in enumerate(self.bookmarks):
            settings.setArrayIndex(i)
            settings.setValue("title", bm["title"])
            settings.setValue("url", bm["url"])
        settings.endArray()

    def add_bookmark(self, title, url):
        self.bookmarks.append({"title": title, "url": url})
        self.save_bookmarks()

    def remove_bookmark(self, index):
        if 0 <= index < len(self.bookmarks):
            self.bookmarks.pop(index)
            self.save_bookmarks()

    def get_bookmarks(self):
        return self.bookmarks


class SpeedDialExtension(Extension):
    """Быстрый набор — стартовая страница с популярными сайтами"""

    def __init__(self):
        super().__init__(
            "Быстрый набор",
            "Стартовая страница с популярными сайтами",
            "🏠"
        )
        self.sites = [
            ("Google", "https://www.google.com", "🔍"),
            ("YouTube", "https://www.youtube.com", "▶️"),
            ("GitHub", "https://github.com", "💻"),
            ("Wikipedia", "https://ru.wikipedia.org", "📚"),
            ("Reddit", "https://www.reddit.com", "🤖"),
            ("Stack Overflow", "https://stackoverflow.com", "📋"),
        ]

    def get_speed_dial_html(self):
        cards = ""
        for name, url, emoji in self.sites:
            cards += f"""
            <a href="{url}" class="card">
                <span class="emoji">{emoji}</span>
                <span class="name">{name}</span>
            </a>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'Segoe UI', sans-serif;
                color: white;
            }}
            h1 {{
                font-size: 2.5em;
                margin-bottom: 10px;
                text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
            }}
            .subtitle {{
                color: #a5b4fc;
                margin-bottom: 40px;
                font-size: 1.1em;
            }}
            .grid {{
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                max-width: 600px;
            }}
            .card {{
                background: rgba(255,255,255,0.08);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 25px;
                text-decoration: none;
                color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                transition: all 0.3s ease;
            }}
            .card:hover {{
                background: rgba(255,255,255,0.15);
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
            }}
            .emoji {{ font-size: 2.5em; }}
            .name {{ font-size: 0.9em; opacity: 0.9; }}
        </style>
        </head>
        <body>
            <h1>🚀 Мой Браузер</h1>
            <p class="subtitle">Быстрый набор</p>
            <div class="grid">{cards}</div>
        </body>
        </html>
        """


# ============================================================
# ОСНОВНОЙ БРАУЗЕР
# ============================================================

class BrowserTab(QWebEngineView):
    """Отдельная вкладка браузера"""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.loadProgress.connect(self._on_progress)

    def _on_progress(self, progress):
        pass  # Можно добавить индикатор загрузки


class MyPersonalBrowser(QMainWindow):
    """Главное окно браузера"""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Мой Личный Браузер 🚀")
        self.resize(1400, 900)

        # Инициализация менеджера расширений
        self.ext_manager = ExtensionManager()
        self._register_default_extensions()

        # Применение тёмной темы
        self._apply_dark_theme()

        # Создание интерфейса
        self._create_ui()

        # Открытие стартовой страницы
        self.new_tab()

    def _register_default_extensions(self):
        """Регистрация встроенных расширений"""
        self.dark_mode_ext = DarkModeExtension()
        self.ad_blocker_ext = AdBlockerExtension()
        self.reader_ext = ReaderModeExtension()
        self.bookmark_ext = BookmarkExtension()
        self.speed_dial_ext = SpeedDialExtension()

        self.ext_manager.register_extension("dark_mode", self.dark_mode_ext)
        self.ext_manager.register_extension("ad_blocker", self.ad_blocker_ext)
        self.ext_manager.register_extension("reader_mode", self.reader_ext)
        self.ext_manager.register_extension("bookmarks", self.bookmark_ext)
        self.ext_manager.register_extension("speed_dial", self.speed_dial_ext)

    def _apply_dark_theme(self):
        """Применение тёмной темы ко всему приложению"""
        dark_palette = QPalette()

        # Основные цвета
        dark_color = QColor(26, 26, 46)
        medium_color = QColor(36, 36, 62)
        light_color = QColor(48, 48, 80)
        text_color = QColor(226, 232, 240)
        accent_color = QColor(139, 92, 246)

        dark_palette.setColor(QPalette.Window, dark_color)
        dark_palette.setColor(QPalette.WindowText, text_color)
        dark_palette.setColor(QPalette.Base, medium_color)
        dark_palette.setColor(QPalette.AlternateBase, dark_color)
        dark_palette.setColor(QPalette.ToolTipBase, light_color)
        dark_palette.setColor(QPalette.ToolTipText, text_color)
        dark_palette.setColor(QPalette.Text, text_color)
        dark_palette.setColor(QPalette.Button, light_color)
        dark_palette.setColor(QPalette.ButtonText, text_color)
        dark_palette.setColor(QPalette.BrightText, QColor(239, 68, 68))
        dark_palette.setColor(QPalette.Link, accent_color)
        dark_palette.setColor(QPalette.Highlight, accent_color)
        dark_palette.setColor(QPalette.HighlightedText, QColor(255, 255, 255))

        QApplication.setPalette(dark_palette)

        # Глобальный QSS стиль
        self.setStyleSheet("""
            QMainWindow {
                background: #1a1a2e;
            }
            QToolBar {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #16213e, stop:1 #1a1a2e);
                border: none;
                border-bottom: 1px solid #2d2d4a;
                padding: 5px;
                spacing: 5px;
            }
            QPushButton {
                background: rgba(139, 92, 246, 0.15);
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 8px;
                color: #e2e8f0;
                padding: 8px 14px;
                font-size: 13px;
                font-weight: 500;
            }
            QPushButton:hover {
                background: rgba(139, 92, 246, 0.3);
                border-color: rgba(139, 92, 246, 0.6);
            }
            QPushButton:pressed {
                background: rgba(139, 92, 246, 0.5);
            }
            QLineEdit {
                background: #0f0c29;
                border: 2px solid #2d2d4a;
                border-radius: 10px;
                color: #e2e8f0;
                padding: 8px 16px;
                font-size: 14px;
                selection-background-color: rgba(139, 92, 246, 0.4);
            }
            QLineEdit:focus {
                border-color: #8b5cf6;
                box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
            }
            QTabWidget::pane {
                border: none;
                background: #1a1a2e;
            }
            QTabBar::tab {
                background: #16213e;
                color: #94a3b8;
                padding: 10px 20px;
                margin-right: 2px;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                min-width: 150px;
                max-width: 250px;
            }
            QTabBar::tab:selected {
                background: #1a1a2e;
                color: #e2e8f0;
                border-bottom: 2px solid #8b5cf6;
            }
            QTabBar::tab:hover {
                background: #1e2a4a;
                color: #e2e8f0;
            }
            QTabBar::close-button {
                subcontrol-position: right;
                padding: 3px;
            }
            QTabBar::close-button:hover {
                background: rgba(239, 68, 68, 0.3);
                border-radius: 4px;
            }
            QStatusBar {
                background: #0f0c29;
                color: #94a3b8;
                border-top: 1px solid #2d2d4a;
            }
            QMenu {
                background: #1e1e3a;
                border: 1px solid #2d2d4a;
                border-radius: 8px;
                padding: 5px;
            }
            QMenu::item {
                color: #e2e8f0;
                padding: 8px 30px;
                border-radius: 4px;
            }
            QMenu::item:selected {
                background: rgba(139, 92, 246, 0.3);
            }
            QComboBox {
                background: #16213e;
                border: 1px solid #2d2d4a;
                border-radius: 6px;
                color: #e2e8f0;
                padding: 5px 10px;
            }
            QComboBox::drop-down {
                border: none;
            }
            QComboBox QAbstractItemView {
                background: #1e1e3a;
                border: 1px solid #2d2d4a;
                color: #e2e8f0;
                selection-background-color: rgba(139, 92, 246, 0.3);
            }
            QScrollBar:vertical {
                background: #1a1a2e;
                width: 10px;
                border-radius: 5px;
            }
            QScrollBar::handle:vertical {
                background: #3d3d5c;
                border-radius: 5px;
                min-height: 30px;
            }
            QScrollBar::handle:vertical:hover {
                background: #8b5cf6;
            }
        """)

    def _create_ui(self):
        """Создание интерфейса"""
        # Панель вкладок
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        self.tabs.setTabsClosable(True)
        self.tabs.tabCloseRequested.connect(self.close_tab)
        self.tabs.currentChanged.connect(self._on_tab_changed)

        self.setCentralWidget(self.tabs)

        # Панель инструментов
        self._create_toolbar()

        # Строка состояния
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_label = QLabel("Готово")
        self.status_bar.addWidget(self.status_label)

        # Горячие клавиши
        QShortcut(QKeySequence("Ctrl+T"), self, self.new_tab)
        QShortcut(QKeySequence("Ctrl+W"), self, self._close_current_tab)
        QShortcut(QKeySequence("Ctrl+L"), self, self.url_bar.setFocus)
        QShortcut(QKeySequence("Ctrl+R"), self, self._reload_current)
        QShortcut(QKeySequence("Ctrl+D"), self, self._add_bookmark)
        QShortcut(QKeySequence("Ctrl+Tab"), self, self._next_tab)
        QShortcut(QKeySequence("Ctrl+Shift+Tab"), self, self._prev_tab)

    def _create_toolbar(self):
        """Создание панели инструментов"""
        toolbar = QToolBar()
        toolbar.setMovable(False)
        toolbar.setIconSize(QSize(20, 20))
        self.addToolBar(toolbar)

        # Кнопки навигации
        self.back_btn = QPushButton("◀")
        self.back_btn.setToolTip("Назад (Alt+Left)")
        self.forward_btn = QPushButton("▶")
        self.forward_btn.setToolTip("Вперёд (Alt+Right)")
        self.reload_btn = QPushButton("⟳")
        self.reload_btn.setToolTip("Обновить (Ctrl+R)")
        self.home_btn = QPushButton("🏠")
        self.home_btn.setToolTip("Домашняя страница")

        # Подключение кнопок
        self.back_btn.clicked.connect(self._go_back)
        self.forward_btn.clicked.connect(self._go_forward)
        self.reload_btn.clicked.connect(self._reload_current)
        self.home_btn.clicked.connect(self._go_home)

        # Адресная строка
        self.url_bar = QLineEdit()
        self.url_bar.setPlaceholderText("🔍 Введите адрес или поисковый запрос...")
        self.url_bar.returnPressed.connect(self.navigate)

        # Кнопка закладок
        self.bookmark_btn = QPushButton("⭐")
        self.bookmark_btn.setToolTip("Добавить в закладки (Ctrl+D)")
        self.bookmark_btn.clicked.connect(self._add_bookmark)

        # Кнопка расширений
        self.ext_btn = QPushButton("🧩")
        self.ext_btn.setToolTip("Управление расширениями")
        self.ext_btn.clicked.connect(self._show_extensions_menu)

        # Новая вкладка
        self.new_tab_btn = QPushButton("+")
        self.new_tab_btn.setToolTip("Новая вкладка (Ctrl+T)")
        self.new_tab_btn.clicked.connect(self.new_tab)

        # Добавляем на панель
        toolbar.addWidget(self.back_btn)
        toolbar.addWidget(self.forward_btn)
        toolbar.addWidget(self.reload_btn)
        toolbar.addWidget(self.home_btn)
        toolbar.addSeparator()
        toolbar.addWidget(self.url_bar)
        toolbar.addSeparator()
        toolbar.addWidget(self.bookmark_btn)
        toolbar.addWidget(self.ext_btn)
        toolbar.addWidget(self.new_tab_btn)

    # ============================================================
    # УПРАВЛЕНИЕ ВКЛАДКАМИ
    # ============================================================

    def new_tab(self, url=""):
        """Создание новой вкладки"""
        if not url:
            # Показываем стартовую страницу
            if self.ext_manager.is_enabled("speed_dial"):
                html = self.speed_dial_ext.get_speed_dial_html()
                new_browser = BrowserTab()
                new_browser.setHtml(html)
            else:
                new_browser = BrowserTab()
                new_browser.setUrl(QUrl("https://www.google.com"))
        else:
            new_browser = BrowserTab()
            new_browser.setUrl(QUrl(url))

        idx = self.tabs.addTab(new_browser, "Новая вкладка")
        self.tabs.setCurrentIndex(idx)
        self.url_bar.setFocus()

        # Подключаем сигналы
        new_browser.titleChanged.connect(
            lambda title, browser=new_browser: self._update_tab_title(browser, title)
        )
        new_browser.urlChanged.connect(
            lambda q, browser=new_browser: self._on_url_changed(browser, q)
        )
        new_browser.loadStarted.connect(
            lambda: self.status_label.setText("Загрузка...")
        )
        new_browser.loadFinished.connect(
            lambda ok: self._on_load_finished(ok)
        )

    def close_tab(self, index):
        """Закрытие вкладки"""
        if self.tabs.count() > 1:
            self.tabs.removeTab(index)
        else:
            # Если последняя вкладка — открываем новую
            self.new_tab()

    def _close_current_tab(self):
        """Закрытие текущей вкладки"""
        self.close_tab(self.tabs.currentIndex())

    def _on_tab_changed(self, index):
        """При переключении вкладки обновляем адресную строку"""
        if index >= 0:
            browser = self.tabs.widget(index)
            if browser:
                self.url_bar.setText(browser.url().toString())

    def _update_tab_title(self, browser, title):
        """Обновление заголовка вкладки"""
        index = self.tabs.indexOf(browser)
        if index >= 0:
            # Обрезаем длинные заголовки
            display_title = title[:30] + "..." if len(title) > 30 else title
            self.tabs.setTabText(index, display_title)

    def _on_url_changed(self, browser, q):
        """Обработка изменения URL"""
        if browser == self.tabs.currentWidget():
            self.url_bar.setText(q.toString())

        # Уведомляем расширения
        for ext in self.ext_manager.get_enabled_extensions():
            ext.on_url_changed(q.toString())

    def _on_load_finished(self, ok):
        """Обработка завершения загрузки"""
        if ok:
            self.status_label.setText("Готово ✓")
            # Уведомляем расширения о загрузке
            current = self.tabs.currentWidget()
            if current:
                for ext in self.ext_manager.get_enabled_extensions():
                    ext.on_page_loaded(current.page())
        else:
            self.status_label.setText("Ошибка загрузки ✗")

    # ============================================================
    # НАВИГАЦИЯ
    # ============================================================

    def navigate(self):
        """Переход по адресу"""
        url = self.url_bar.text().strip()

        # Если это поисковый запрос (не URL)
        if "." not in url and ":" not in url:
            url = f"https://www.google.com/search?q={url}"
        elif not url.startswith("http"):
            url = "https://" + url

        current = self.tabs.currentWidget()
        if current:
            current.setUrl(QUrl(url))

    def _go_back(self):
        current = self.tabs.currentWidget()
        if current:
            current.back()

    def _go_forward(self):
        current = self.tabs.currentWidget()
        if current:
            current.forward()

    def _reload_current(self):
        current = self.tabs.currentWidget()
        if current:
            current.reload()

    def _go_home(self):
        """Домашняя страница"""
        if self.ext_manager.is_enabled("speed_dial"):
            current = self.tabs.currentWidget()
            if current:
                current.setHtml(self.speed_dial_ext.get_speed_dial_html())
        else:
            current = self.tabs.currentWidget()
            if current:
                current.setUrl(QUrl("https://www.google.com"))

    def _next_tab(self):
        """Следующая вкладка"""
        current = self.tabs.currentIndex()
        if current < self.tabs.count() - 1:
            self.tabs.setCurrentIndex(current + 1)
        else:
            self.tabs.setCurrentIndex(0)

    def _prev_tab(self):
        """Предыдущая вкладка"""
        current = self.tabs.currentIndex()
        if current > 0:
            self.tabs.setCurrentIndex(current - 1)
        else:
            self.tabs.setCurrentIndex(self.tabs.count() - 1)

    # ============================================================
    # ЗАКЛАДКИ
    # ============================================================

    def _add_bookmark(self):
        """Добавление текущей страницы в закладки"""
        current = self.tabs.currentWidget()
        if current:
            title = current.title() or "Без названия"
            url = current.url().toString()
            self.bookmark_ext.add_bookmark(title, url)
            self.status_label.setText(f"⭐ Добавлено в закладки: {title}")

    # ============================================================
    # РАСШИРЕНИЯ
    # ============================================================

    def _show_extensions_menu(self):
        """Показать меню управления расширениями"""
        menu = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background: #1e1e3a;
                border: 1px solid #2d2d4a;
                border-radius: 8px;
                padding: 8px;
                min-width: 250px;
            }
            QMenu::item {
                color: #e2e8f0;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 13px;
            }
            QMenu::item:selected {
                background: rgba(139, 92, 246, 0.3);
            }
        """)

        for name, ext in self.ext_manager.extensions.items():
            status = "✓" if self.ext_manager.is_enabled(name) else "○"
            action = QAction(f"{ext.icon} {ext.name}  [{status}]", self)
            action.setToolTip(ext.description)
            action.triggered.connect(
                lambda checked, n=name: self._toggle_extension(n)
            )
            menu.addAction(action)

        menu.addSeparator()
        info_action = QAction("ℹ️ О расширениях", self)
        info_action.triggered.connect(self._show_extensions_info)
        menu.addAction(info_action)

        self.ext_btn.setMenu(menu)
        menu.popup(self.ext_btn.mapToGlobal(
            self.ext_btn.rect().bottomLeft()
        ))

    def _toggle_extension(self, name):
        """Переключение расширения"""
        self.ext_manager.toggle_extension(name)
        status = "включено" if self.ext_manager.is_enabled(name) else "выключено"
        self.status_label.setText(
            f"🧩 {self.ext_manager.extensions[name].name} — {status}"
        )

    def _show_extensions_info(self):
        """Информация о расширениях"""
        msg = QMessageBox(self)
        msg.setWindowTitle("Расширения")
        msg.setText("🧩 Система расширений")
        info = "\\n".join([
            f"{ext.icon} {ext.name}: {ext.description}"
            for ext in self.ext_manager.extensions.values()
        ])
        msg.setInformativeText(info)
        msg.setStyleSheet("""
            QMessageBox {
                background: #1e1e3a;
            }
            QMessageBox QLabel {
                color: #e2e8f0;
                font-size: 13px;
            }
            QPushButton {
                background: rgba(139, 92, 246, 0.3);
                border: 1px solid #8b5cf6;
                color: white;
                padding: 8px 20px;
                border-radius: 6px;
            }
        """)
        msg.exec_()


# ============================================================
# ЗАПУСК ПРИЛОЖЕНИЯ
# ============================================================

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    app.setApplicationName("Мой Личный Браузер")

    # Установка шрифта
    font = QFont("Segoe UI", 10)
    app.setFont(font)

    window = MyPersonalBrowser()
    window.show()
    sys.exit(app.exec_())
`;

const requirementsCode = `# requirements.txt
PyQt5>=5.15.0
PyQtWebEngine>=5.15.0
`;

const readmeCode = `# 🚀 Мой Личный Браузер

Персональный браузер на PyQt5 с вкладками, тёмной темой и системой расширений.

## Возможности

### 📑 Вкладки
- Создание/закрытие вкладок
- Переключение между вкладками (Ctrl+Tab)
- Каждая вкладка работает независимо

### 🌙 Тёмная тема
- Полностью кастомная тёмная тема
- Градиентные фоны и анимации
- Приятные для глаз цвета

### 🧩 Расширения
- **Тёмный режим** — принудительная тёмная тема на сайтах
- **Блокировщик рекламы** — убирает баннеры и попапы
- **Режим чтения** — только текст, ничего лишнего
- **Закладки** — сохранение любимых сайтов
- **Быстрый набор** — красивая стартовая страница

### ⌨️ Горячие клавиши
| Клавиша | Действие |
|---------|----------|
| Ctrl+T | Новая вкладка |
| Ctrl+W | Закрыть вкладку |
| Ctrl+L | Фокус на адресную строку |
| Ctrl+R | Обновить страницу |
| Ctrl+D | Добавить в закладки |
| Ctrl+Tab | Следующая вкладка |
| Ctrl+Shift+Tab | Предыдущая вкладка |

## Установка

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Запуск

\`\`\`bash
python browser.py
\`\`\`

## Создание своих расширений

\`\`\`python
class MyExtension(Extension):
    def __init__(self):
        super().__init__(
            "Моё расширение",
            "Описание того, что оно делает",
            "🎯"
        )

    def on_page_loaded(self, page):
        # Код выполняется после загрузки каждой страницы
        page.runJavaScript("alert('Привет!')")
\`\`\`
`;

type Tab = {
  id: string;
  label: string;
  icon: string;
  code: string;
  language: string;
};

const tabs: Tab[] = [
  { id: 'main', label: 'browser.py', icon: '🐍', code: mainCode, language: 'python' },
  { id: 'req', label: 'requirements.txt', icon: '📦', code: requirementsCode, language: 'text' },
  { id: 'readme', label: 'README.md', icon: '📖', code: readmeCode, language: 'markdown' },
];

const features = [
  { icon: '📑', title: 'Вкладки', desc: 'Полноценная система вкладок с возможностью закрытия, переключения и создания новых' },
  { icon: '🌙', title: 'Тёмная тема', desc: 'Красивая тёмная тема с градиентами, фиолетовыми акцентами и плавными переходами' },
  { icon: '🧩', title: 'Расширения', desc: 'Модульная система расширений: блокировщик рекламы, режим чтения, закладки и другие' },
  { icon: '⌨️', title: 'Горячие клавиши', desc: 'Ctrl+T, Ctrl+W, Ctrl+L, Ctrl+R, Ctrl+D и другие сочетания для быстрого управления' },
  { icon: '🏠', title: 'Стартовая страница', desc: 'Красивый Speed Dial с популярными сайтами и градиентным фоном' },
  { icon: '⭐', title: 'Закладки', desc: 'Сохранение и управление закладками с персистентным хранением через QSettings' },
];

function App() {
  const [activeTab, setActiveTab] = useState('main');
  const [copied, setCopied] = useState(false);

  const currentTab = tabs.find(t => t.id === activeTab)!;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTab.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-gray-100">
      {/* Header */}
      <header className="border-b border-purple-900/30 bg-gradient-to-r from-[#0f0c29] via-[#1a1a2e] to-[#16213e]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🚀</div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Мой Личный Браузер
              </h1>
              <p className="text-gray-400 mt-1">
                PyQt5 • Вкладки • Тёмная тема • Расширения
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-[#16213e]/60 border border-purple-900/20 rounded-xl p-5 hover:border-purple-500/40 transition-all duration-300 hover:transform hover:-translate-y-1"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-purple-200 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code Section */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <div className="bg-[#1e1e3a] rounded-2xl border border-purple-900/30 overflow-hidden shadow-2xl shadow-purple-900/10">
          {/* Tab bar */}
          <div className="flex items-center bg-[#0f0c29] border-b border-purple-900/30">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-200 bg-[#1e1e3a]/50'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1e1e3a]/30'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            <div className="ml-auto pr-4">
              <button
                onClick={handleCopy}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/40 transition-all duration-200"
              >
                {copied ? '✓ Скопировано!' : '📋 Копировать'}
              </button>
            </div>
          </div>

          {/* Code */}
          <div className="overflow-auto max-h-[70vh]">
            <SyntaxHighlighter
              language={currentTab.language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '20px',
                background: '#1e1e3a',
                fontSize: '13px',
                lineHeight: '1.6',
              }}
              showLineNumbers
              wrapLines
            >
              {currentTab.code}
            </SyntaxHighlighter>
          </div>
        </div>
      </section>

      {/* Browser Preview */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold text-purple-200 mb-6 flex items-center gap-3">
          <span>🖥️</span> Как это выглядит
        </h2>
        <div className="bg-[#1a1a2e] rounded-2xl border border-purple-900/30 overflow-hidden shadow-2xl">
          {/* Fake browser chrome */}
          <div className="bg-gradient-to-r from-[#16213e] to-[#1a1a2e] border-b border-[#2d2d4a] p-3">
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-3">
              <div className="bg-[#1a1a2e] text-gray-200 text-xs px-4 py-2 rounded-t-lg border-b-2 border-purple-500 flex items-center gap-2">
                <span>🔍</span> Google
                <span className="text-gray-500 ml-2 hover:text-red-400 cursor-pointer">×</span>
              </div>
              <div className="bg-[#16213e] text-gray-500 text-xs px-4 py-2 rounded-t-lg flex items-center gap-2">
                <span>💻</span> GitHub
                <span className="text-gray-600 ml-2 hover:text-red-400 cursor-pointer">×</span>
              </div>
              <button className="text-gray-500 hover:text-gray-300 text-lg px-2">+</button>
            </div>
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <button className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-gray-300">◀</button>
              <button className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-gray-300">▶</button>
              <button className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-gray-300">⟳</button>
              <button className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-gray-300">🏠</button>
              <div className="flex-1 bg-[#0f0c29] border-2 border-[#2d2d4a] rounded-xl px-4 py-2 text-sm text-gray-300">
                🔍 https://www.google.com
              </div>
              <button className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-gray-300">⭐</button>
              <button className="bg-purple-500/15 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-gray-300">🧩</button>
            </div>
          </div>
          {/* Content area */}
          <div className="bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] p-12 min-h-[300px] flex flex-col items-center justify-center">
            <h3 className="text-3xl font-bold text-white mb-2">🚀 Мой Браузер</h3>
            <p className="text-indigo-300 mb-8">Быстрый набор</p>
            <div className="grid grid-cols-3 gap-4 max-w-md">
              {[
                { emoji: '🔍', name: 'Google' },
                { emoji: '▶️', name: 'YouTube' },
                { emoji: '💻', name: 'GitHub' },
                { emoji: '📚', name: 'Wikipedia' },
                { emoji: '🤖', name: 'Reddit' },
                { emoji: '📋', name: 'Stack Overflow' },
              ].map((site, i) => (
                <div
                  key={i}
                  className="bg-white/8 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-2 hover:bg-white/15 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <span className="text-3xl">{site.emoji}</span>
                  <span className="text-xs text-gray-300">{site.name}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Status bar */}
          <div className="bg-[#0f0c29] border-t border-[#2d2d4a] px-4 py-2">
            <span className="text-xs text-gray-500">Готово ✓</span>
          </div>
        </div>
      </section>

      {/* Keyboard shortcuts */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold text-purple-200 mb-6 flex items-center gap-3">
          <span>⌨️</span> Горячие клавиши
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { keys: 'Ctrl+T', action: 'Новая вкладка' },
            { keys: 'Ctrl+W', action: 'Закрыть вкладку' },
            { keys: 'Ctrl+L', action: 'Фокус на адресную строку' },
            { keys: 'Ctrl+R', action: 'Обновить страницу' },
            { keys: 'Ctrl+D', action: 'Добавить в закладки' },
            { keys: 'Ctrl+Tab', action: 'Следующая вкладка' },
            { keys: 'Ctrl+Shift+Tab', action: 'Предыдущая вкладка' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-[#16213e]/60 border border-purple-900/20 rounded-xl px-5 py-3">
              <span className="text-gray-300 text-sm">{item.action}</span>
              <kbd className="bg-[#0f0c29] border border-purple-500/30 rounded-lg px-3 py-1 text-xs text-purple-300 font-mono">
                {item.keys}
              </kbd>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-900/20 bg-[#0f0c29] py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>🚀 Мой Личный Браузер — Создан с ❤️ на PyQt5</p>
          <p className="mt-1 text-gray-600">pip install PyQt5 PyQtWebEngine && python browser.py</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
