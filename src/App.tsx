import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Section = 'preview' | 'extensions' | 'settings' | 'code' | 'shortcuts';

// ============ CODE ============
const mainCode = `# ============================================================
# KUCKI BROWSER v1.0.0
# Разработано: Kucki Development
# ============================================================

import sys
from PyQt5.QtCore import QUrl, Qt, QSize, QSettings
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QLineEdit, QPushButton, QToolBar,
    QTabWidget, QMenu, QAction, QStatusBar, QLabel, QMessageBox,
    QShortcut, QWidget, QVBoxLayout, QHBoxLayout, QFrame,
    QListWidget, QListWidgetItem, QStackedWidget, QCheckBox,
    QComboBox, QSpinBox, QRadioButton, QButtonGroup, QScrollArea
)
from PyQt5.QtWebEngineWidgets import QWebEngineView
from PyQt5.QtGui import QKeySequence, QFont, QPalette, QColor


# ============================================================
# РАСШИРЕНИЯ (как в Chrome)
# ============================================================

class Extension:
    """Базовый класс расширения"""
    def __init__(self, ext_id, name, version, description, icon, author=""):
        self.id = ext_id
        self.name = name
        self.version = version
        self.description = description
        self.icon = icon
        self.author = author
        self.enabled = False

    def on_load(self, page): pass
    def on_url(self, url): pass


class DarkModeExt(Extension):
    def __init__(self):
        super().__init__("dark-mode", "Тёмный режим", "1.2.0",
            "Принудительная тёмная тема на всех сайтах", "🌙", "Kucki Development")

    def on_load(self, page):
        page.runJavaScript("""
            var s=document.createElement('style');
            s.textContent='html{filter:invert(.88) hue-rotate(180deg)!important}img,video{filter:invert(1) hue-rotate(180deg)!important}';
            document.head.appendChild(s);
        """)


class AdBlockerExt(Extension):
    def __init__(self):
        super().__init__("ad-blocker", "Блокировщик рекламы", "2.0.1",
            "Удаляет баннеры, попапы и трекеры", "🛡️", "Kucki Development")

    def on_load(self, page):
        page.runJavaScript("""
            window.open=function(){return null};
            document.querySelectorAll('[class*=ad],[id*=banner],.adsbygoogle')
                .forEach(e=>e.remove());
        """)


class ReaderExt(Extension):
    def __init__(self):
        super().__init__("reader", "Режим чтения", "1.0.0",
            "Убирает всё лишнее, оставляя только текст", "📖", "Kucki Development")


class BookmarksExt(Extension):
    def __init__(self):
        super().__init__("bookmarks", "Закладки", "1.1.0",
            "Управление закладками с синхронизацией", "⭐", "Kucki Development")
        self.items = []
        self._load()

    def _load(self):
        s = QSettings("KuckiBrowser", "Bookmarks")
        n = s.beginReadArray("items")
        for i in range(n):
            s.setArrayIndex(i)
            self.items.append({"t": s.value("t"), "u": s.value("u")})
        s.endArray()

    def add(self, title, url):
        self.items.append({"t": title, "u": url})
        self._save()

    def _save(self):
        s = QSettings("KuckiBrowser", "Bookmarks")
        s.beginWriteArray("items")
        for i, b in enumerate(self.items):
            s.setArrayIndex(i)
            s.setValue("t", b["t"]); s.setValue("u", b["u"])
        s.endArray()


class SpeedDialExt(Extension):
    def __init__(self):
        super().__init__("speed-dial", "Быстрый набор", "1.0.0",
            "Стартовая страница с избранными сайтами", "🏠", "Kucki Development")


# ============================================================
# МЕНЕДЖЕР РАСШИРЕНИЙ
# ============================================================

class ExtensionManager:
    def __init__(self):
        self.extensions = {}
        self._register_defaults()
        self._load_state()

    def _register_defaults(self):
        for ext in [DarkModeExt(), AdBlockerExt(), ReaderExt(),
                    BookmarksExt(), SpeedDialExt()]:
            self.extensions[ext.id] = ext

    def _load_state(self):
        s = QSettings("KuckiBrowser", "Extensions")
        enabled = s.value("enabled", []) or []
        for ext_id in enabled:
            if ext_id in self.extensions:
                self.extensions[ext_id].enabled = True

    def _save_state(self):
        s = QSettings("KuckiBrowser", "Extensions")
        s.setValue("enabled", [e.id for e in self.extensions.values() if e.enabled])

    def toggle(self, ext_id):
        if ext_id in self.extensions:
            self.extensions[ext_id].enabled = not self.extensions[ext_id].enabled
            self._save_state()

    def remove(self, ext_id):
        if ext_id in self.extensions:
            del self.extensions[ext_id]
            self._save_state()


# ============================================================
# НАСТРОЙКИ KUCKI BROWSER
# ============================================================

class BrowserSettings:
    def __init__(self):
        self.s = QSettings("KuckiBrowser", "Config")
        self.load()

    def load(self):
        self.homepage = self.s.value("homepage", "speed-dial://newtab")
        self.search_engine = self.s.value("search", "google")
        self.theme = self.s.value("theme", "dark")
        self.font_size = int(self.s.value("fontSize", 14))
        self.restore_tabs = self.s.value("restoreTabs", True, type=bool)
        self.block_popups = self.s.value("blockPopups", True, type=bool)
        self.do_not_track = self.s.value("doNotTrack", False, type=bool)
        self.clear_on_exit = self.s.value("clearOnExit", False, type=bool)

    def save(self):
        self.s.setValue("homepage", self.homepage)
        self.s.setValue("search", self.search_engine)
        self.s.setValue("theme", self.theme)
        self.s.setValue("fontSize", self.font_size)
        self.s.setValue("restoreTabs", self.restore_tabs)
        self.s.setValue("blockPopups", self.block_popups)
        self.s.setValue("doNotTrack", self.do_not_track)
        self.s.setValue("clearOnExit", self.clear_on_exit)


# ============================================================
# ОКНО НАСТРОЕК
# ============================================================

class SettingsWindow(QMainWindow):
    def __init__(self, settings, ext_manager, parent=None):
        super().__init__(parent)
        self.settings = settings
        self.ext_manager = ext_manager
        self.setWindowTitle("Настройки")
        self.resize(900, 650)
        self._build_ui()

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        layout = QHBoxLayout(central)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Боковая навигация
        sidebar = QWidget()
        sidebar.setFixedWidth(220)
        sidebar.setStyleSheet("background:#111113;border-right:1px solid #222225")
        sb_layout = QVBoxLayout(sidebar)
        sb_layout.setContentsMargins(12, 20, 12, 20)

        title = QLabel("Настройки")
        title.setStyleSheet("color:#fafafa;font-size:18px;font-weight:600")
        sb_layout.addWidget(title)
        sb_layout.addSpacing(16)

        self.stack = QStackedWidget()
        self.stack.setStyleSheet("background:#0a0a0c")

        items = [
            ("🎨  Внешний вид", self._page_appearance),
            ("🔍  Поиск", self._page_search),
            ("🧩  Расширения", self._page_extensions),
            ("🔒  Приватность", self._page_privacy),
            ("⌨️  Горячие клавиши", self._page_shortcuts),
        ]
        for label, page_fn in items:
            btn = QPushButton(label)
            btn.setCheckable(True)
            btn.setStyleSheet("""
                QPushButton { text-align:left; background:transparent; border:none;
                    color:#a1a1aa; padding:10px 14px; border-radius:8px; font-size:13px }
                QPushButton:hover { background:#1a1a1d; color:#fafafa }
                QPushButton:checked { background:#1a1a1d; color:#10b981 }
            """)
            btn.clicked.connect(lambda c, b=btn: self._select(b))
            sb_layout.addWidget(btn)

        sb_layout.addStretch()
        layout.addWidget(sidebar)

        # Контент
        self.stack.addWidget(self._page_appearance())
        self.stack.addWidget(self._page_search())
        self.stack.addWidget(self._page_extensions())
        self.stack.addWidget(self._page_privacy())
        self.stack.addWidget(self._page_shortcuts())
        layout.addWidget(self.stack, 1)

        # Активируем первый пункт
        sb_layout.itemAt(3).widget().setChecked(True)

    def _select(self, btn):
        for w in btn.parent().findChildren(QPushButton):
            w.setChecked(False)
        btn.setChecked(True)
        idx = ["🎨  Внешний вид","🔍  Поиск","🧩  Расширения",
               "🔒  Приватность","⌨️  Горячие клавиши"].index(btn.text())
        self.stack.setCurrentIndex(idx)

    def _row(self, title, desc, widget):
        f = QFrame()
        f.setStyleSheet("border-bottom:1px solid #1a1a1d")
        l = QHBoxLayout(f)
        l.setContentsMargins(24, 16, 24, 16)
        t = QVBoxLayout()
        t.addWidget(QLabel(f'<b style="color:#fafafa">{title}</b>'))
        t.addWidget(QLabel(f'<span style="color:#71717a;font-size:12px">{desc}</span>'))
        l.addLayout(t, 1)
        l.addWidget(widget)
        return f

    def _page_appearance(self):
        w = QScrollArea()
        w.setWidgetResizable(True)
        w.setStyleSheet("QScrollArea{border:none}")
        c = QWidget()
        v = QVBoxLayout(c)
        v.setContentsMargins(0, 0, 0, 0)
        v.setSpacing(0)

        header = QLabel("   Внешний вид")
        header.setStyleSheet("color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:20px 24px 8px")
        v.addWidget(header)

        # Тема
        theme_box = QComboBox()
        theme_box.addItems(["Тёмная", "Светлая", "Системная"])
        theme_box.setStyleSheet("""QComboBox{background:#18181b;color:#fafafa;
            border:1px solid #27272a;border-radius:6px;padding:6px 12px}""")
        v.addWidget(self._row("Тема", "Цветовая схема интерфейса", theme_box))

        # Размер шрифта
        font_spin = QSpinBox()
        font_spin.setRange(10, 24)
        font_spin.setValue(self.settings.font_size)
        font_spin.setStyleSheet("""QSpinBox{background:#18181b;color:#fafafa;
            border:1px solid #27272a;border-radius:6px;padding:4px 8px}""")
        v.addWidget(self._row("Размер шрифта", "Размер текста в интерфейсе", font_spin))

        # Восстановление вкладок
        restore_cb = QCheckBox()
        restore_cb.setChecked(self.settings.restore_tabs)
        v.addWidget(self._row("Восстанавливать вкладки",
            "Открывать предыдущие вкладки при запуске", restore_cb))

        v.addStretch()
        w.setWidget(c)
        return w

    def _page_search(self):
        w = QScrollArea(); w.setWidgetResizable(True)
        w.setStyleSheet("QScrollArea{border:none}")
        c = QWidget(); v = QVBoxLayout(c); v.setContentsMargins(0,0,0,0); v.setSpacing(0)

        header = QLabel("   Поисковая система")
        header.setStyleSheet("color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:20px 24px 8px")
        v.addWidget(header)

        group = QButtonGroup(self)
        for sid, name in [("google","Google"),("duckduckgo","DuckDuckGo"),
                          ("bing","Bing"),("yandex","Яндекс")]:
            rb = QRadioButton(name)
            rb.setStyleSheet("QRadioButton{color:#fafafa;padding:8px}")
            if sid == self.settings.search_engine: rb.setChecked(True)
            group.addButton(rb)
            v.addWidget(self._row(name, f"Использовать {name} по умолчанию", rb))

        v.addStretch()
        w.setWidget(c)
        return w

    def _page_extensions(self):
        w = QScrollArea(); w.setWidgetResizable(True)
        w.setStyleSheet("QScrollArea{border:none}")
        c = QWidget(); v = QVBoxLayout(c); v.setContentsMargins(0,0,0,0); v.setSpacing(0)

        header = QLabel("   Установленные расширения")
        header.setStyleSheet("color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:20px 24px 8px")
        v.addWidget(header)

        for ext in self.ext_manager.extensions.values():
            cb = QCheckBox()
            cb.setChecked(ext.enabled)
            cb.stateChanged.connect(lambda s, eid=ext.id: self.ext_manager.toggle(eid))
            v.addWidget(self._row(f"{ext.icon}  {ext.name}",
                f"v{ext.version} · {ext.description}", cb))

        v.addStretch()
        w.setWidget(c)
        return w

    def _page_privacy(self):
        w = QScrollArea(); w.setWidgetResizable(True)
        w.setStyleSheet("QScrollArea{border:none}")
        c = QWidget(); v = QVBoxLayout(c); v.setContentsMargins(0,0,0,0); v.setSpacing(0)

        header = QLabel("   Конфиденциальность")
        header.setStyleSheet("color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding:20px 24px 8px")
        v.addWidget(header)

        v.addWidget(self._row("Блокировать всплывающие окна",
            "Запретить сайтам открывать попапы",
            self._cb(self.settings.block_popups, "blockPopups")))
        v.addWidget(self._row("Do Not Track",
            "Отправлять запрос DNT сайтам",
            self._cb(self.settings.do_not_track, "doNotTrack")))
        v.addWidget(self._row("Очищать данные при выходе",
            "Удалять cookies и кеш при закрытии",
            self._cb(self.settings.clear_on_exit, "clearOnExit")))

        v.addStretch()
        w.setWidget(c)
        return w

    def _cb(self, checked, key):
        cb = QCheckBox(); cb.setChecked(checked)
        cb.stateChanged.connect(lambda s, k=key: self._save_bool(k, s==2))
        return cb

    def _save_bool(self, key, val):
        setattr(self.settings, key, val)
        self.settings.save()

    def _page_shortcuts(self):
        w = QScrollArea(); w.setWidgetResizable(True)
        w.setStyleSheet("QScrollArea{border:none}")
        c = QWidget(); v = QVBoxLayout(c); v.setContentsMargins(24,20,24,20)

        shortcuts = [
            ("Ctrl+T", "Новая вкладка"),
            ("Ctrl+W", "Закрыть вкладку"),
            ("Ctrl+L", "Фокус на адресную строку"),
            ("Ctrl+R", "Обновить страницу"),
            ("Ctrl+D", "Добавить в закладки"),
            ("Ctrl+Tab", "Следующая вкладка"),
            ("Ctrl+Shift+Tab", "Предыдущая вкладка"),
            ("Ctrl+,", "Открыть настройки"),
        ]
        for keys, action in shortcuts:
            row = QFrame()
            row.setStyleSheet("border-bottom:1px solid #1a1a1d")
            hl = QHBoxLayout(row)
            hl.setContentsMargins(0, 12, 0, 12)
            hl.addWidget(QLabel(f'<span style="color:#fafafa">{action}</span>'))
            hl.addStretch()
            kbd = QLabel(keys)
            kbd.setStyleSheet("""background:#18181b;color:#10b981;
                border:1px solid #27272a;border-radius:6px;padding:4px 10px;
                font-family:monospace;font-size:12px""")
            hl.addWidget(kbd)
            v.addWidget(row)

        v.addStretch()
        w.setWidget(c)
        return w


# ============================================================
# KUCKI BROWSER — основное окно
# ============================================================

class KuckiBrowser(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Kucki Browser")
        self.resize(1400, 900)

        self.settings = BrowserSettings()
        self.ext_manager = ExtensionManager()
        self._apply_theme()
        self._build_ui()
        self.new_tab()

    def _apply_theme(self):
        p = QPalette()
        bg = QColor("#0a0a0c")
        surface = QColor("#111113")
        border = QColor("#222225")
        text = QColor("#fafafa")
        muted = QColor("#a1a1aa")
        accent = QColor("#10b981")

        p.setColor(QPalette.Window, bg)
        p.setColor(QPalette.WindowText, text)
        p.setColor(QPalette.Base, surface)
        p.setColor(QPalette.Text, text)
        p.setColor(QPalette.Button, surface)
        p.setColor(QPalette.ButtonText, text)
        p.setColor(QPalette.Highlight, accent)
        p.setColor(QPalette.HighlightedText, QColor("#ffffff"))
        QApplication.setPalette(p)

        self.setStyleSheet(f"""
            QMainWindow {{ background: {bg.name()}; }}
            QToolBar {{
                background: {surface.name()};
                border: none;
                border-bottom: 1px solid {border.name()};
                padding: 8px 12px;
                spacing: 6px;
            }}
            QPushButton {{
                background: transparent;
                border: 1px solid transparent;
                color: {muted.name()};
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 14px;
            }}
            QPushButton:hover {{
                background: #1a1a1d;
                color: {text.name()};
            }}
            QLineEdit {{
                background: #0a0a0c;
                border: 1px solid {border.name()};
                border-radius: 8px;
                color: {text.name()};
                padding: 8px 14px;
                font-size: 13px;
            }}
            QLineEdit:focus {{
                border-color: {accent.name()};
            }}
            QTabWidget::pane {{ border: none; background: {bg.name()}; }}
            QTabBar::tab {{
                background: {surface.name()};
                color: {muted.name()};
                padding: 8px 16px;
                margin-right: 1px;
                border: none;
                min-width: 120px;
                max-width: 200px;
                font-size: 12px;
            }}
            QTabBar::tab:selected {{
                background: {bg.name()};
                color: {text.name()};
                border-top: 2px solid {accent.name()};
            }}
            QTabBar::tab:hover {{ color: {text.name()}; }}
            QStatusBar {{
                background: {surface.name()};
                color: {muted.name()};
                border-top: 1px solid {border.name()};
                font-size: 11px;
            }}
        """)

    def _build_ui(self):
        self.tabs = QTabWidget()
        self.tabs.setDocumentMode(True)
        self.tabs.setTabsClosable(True)
        self.tabs.tabCloseRequested.connect(self._close_tab)
        self.tabs.currentChanged.connect(self._on_tab_changed)
        self.setCentralWidget(self.tabs)

        tb = QToolBar(); tb.setMovable(False)
        self.addToolBar(tb)

        self.back_btn = QPushButton("←")
        self.fwd_btn = QPushButton("→")
        self.reload_btn = QPushButton("⟳")
        self.home_btn = QPushButton("⌂")
        self.settings_btn = QPushButton("⚙")

        self.back_btn.clicked.connect(lambda: self._cur().back())
        self.fwd_btn.clicked.connect(lambda: self._cur().forward())
        self.reload_btn.clicked.connect(lambda: self._cur().reload())
        self.home_btn.clicked.connect(self._go_home)
        self.settings_btn.clicked.connect(self._open_settings)

        self.url_bar = QLineEdit()
        self.url_bar.setPlaceholderText("Поиск или URL")
        self.url_bar.returnPressed.connect(self._navigate)

        tb.addWidget(self.back_btn)
        tb.addWidget(self.fwd_btn)
        tb.addWidget(self.reload_btn)
        tb.addWidget(self.home_btn)
        tb.addWidget(self.url_bar)
        tb.addWidget(self.settings_btn)

        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.addWidget(QLabel("Готово"))

        QShortcut(QKeySequence("Ctrl+T"), self, self.new_tab)
        QShortcut(QKeySequence("Ctrl+W"), self, self._close_current)
        QShortcut(QKeySequence("Ctrl+L"), self, lambda: self.url_bar.setFocus())
        QShortcut(QKeySequence("Ctrl+,"), self, self._open_settings)

    def _cur(self):
        return self.tabs.currentWidget()

    def new_tab(self, url=""):
        b = QWebEngineView()
        b.setUrl(QUrl(url or "https://google.com"))
        i = self.tabs.addTab(b, "Новая вкладка")
        self.tabs.setCurrentIndex(i)
        b.titleChanged.connect(lambda t, br=b: self._set_title(br, t))
        b.urlChanged.connect(lambda q, br=b: self._on_url(br, q))

    def _set_title(self, b, t):
        i = self.tabs.indexOf(b)
        if i >= 0:
            self.tabs.setTabText(i, (t[:25]+"…") if len(t)>25 else t)

    def _on_url(self, b, q):
        if b == self._cur():
            self.url_bar.setText(q.toString())

    def _on_tab_changed(self, i):
        if i >= 0 and self.tabs.widget(i):
            self.url_bar.setText(self.tabs.widget(i).url().toString())

    def _close_tab(self, i):
        if self.tabs.count() > 1: self.tabs.removeTab(i)
        else: self.new_tab()

    def _close_current(self):
        self._close_tab(self.tabs.currentIndex())

    def _navigate(self):
        u = self.url_bar.text().strip()
        if "." not in u and ":" not in u:
            u = f"https://google.com/search?q={u}"
        elif not u.startswith("http"):
            u = "https://" + u
        if self._cur(): self._cur().setUrl(QUrl(u))

    def _go_home(self):
        if self._cur(): self._cur().setUrl(QUrl("https://google.com"))

    def _open_settings(self):
        self.sw = SettingsWindow(self.settings, self.ext_manager, self)
        self.sw.show()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setApplicationName("Kucki Browser")
    app.setOrganizationName("Kucki Development")
    app.setStyle("Fusion")
    app.setFont(QFont("Inter", 10))
    w = KuckiBrowser()
    w.show()
    sys.exit(app.exec_())
`;

const requirementsCode = `PyQt5>=5.15.0
PyQtWebEngine>=5.15.0
`;

// ============ UI ============

function App() {
  const [section, setSection] = useState<Section>('preview');
  const [copied, setCopied] = useState(false);
  const [extEnabled, setExtEnabled] = useState<Record<string, boolean>>({
    'dark-mode': true,
    'ad-blocker': true,
    'reader': false,
    'bookmarks': true,
    'speed-dial': true,
  });

  const extensions = [
    { id: 'dark-mode', name: 'Тёмный режим', ver: '1.2.0', desc: 'Принудительная тёмная тема на всех сайтах', icon: '🌙', author: 'Kucki Development' },
    { id: 'ad-blocker', name: 'Блокировщик рекламы', ver: '2.0.1', desc: 'Удаляет баннеры, попапы и трекеры', icon: '🛡️', author: 'Kucki Development' },
    { id: 'reader', name: 'Режим чтения', ver: '1.0.0', desc: 'Убирает всё лишнее, оставляя только текст', icon: '📖', author: 'Kucki Development' },
    { id: 'bookmarks', name: 'Закладки', ver: '1.1.0', desc: 'Управление закладками с синхронизацией', icon: '⭐', author: 'Kucki Development' },
    { id: 'speed-dial', name: 'Быстрый набор', ver: '1.0.0', desc: 'Стартовая страница с избранными сайтами', icon: '🏠', author: 'Kucki Development' },
  ];

  const toggleExt = (id: string) => {
    setExtEnabled(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(mainCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: 'preview', label: 'Превью', icon: '◉' },
    { id: 'extensions', label: 'Расширения', icon: '⧉' },
    { id: 'settings', label: 'Настройки', icon: '⚙' },
    { id: 'code', label: 'Код', icon: '⟨⟩' },
    { id: 'shortcuts', label: 'Клавиши', icon: '⌨' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#fafafa] font-sans antialiased">
      {/* Top bar — browser-like tabs */}
      <div className="sticky top-0 z-50 bg-[#111113] border-b border-[#222225]">
        <div className="flex items-center">
          {/* Traffic lights */}
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>

          {/* Tabs */}
          <div className="flex items-end pt-2">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`px-5 py-2 text-[12px] tracking-wide rounded-t-lg transition-colors border-r border-[#222225] ${
                  section === s.id
                    ? 'bg-[#0a0a0c] text-[#fafafa] border-t-2 border-t-[#10b981]'
                    : 'bg-[#111113] text-[#71717a] hover:text-[#a1a1aa]'
                }`}
              >
                <span className="mr-2 opacity-70">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {section === 'preview' && <PreviewSection />}
        {section === 'extensions' && (
          <ExtensionsSection
            extensions={extensions}
            enabled={extEnabled}
            onToggle={toggleExt}
          />
        )}
        {section === 'settings' && <SettingsSection />}
        {section === 'code' && (
          <CodeSection
            code={mainCode}
            reqCode={requirementsCode}
            copied={copied}
            onCopy={copyCode}
          />
        )}
        {section === 'shortcuts' && <ShortcutsSection />}
      </main>

      <footer className="border-t border-[#1a1a1d] py-6 text-center text-[11px] text-[#52525b] space-y-1">
        <div>© 2026 <span className="text-[#71717a]">Kucki Development</span> · Kucki Browser v1.0.0</div>
        <code className="font-mono">pip install PyQt5 PyQtWebEngine && python kucki_browser.py</code>
      </footer>
    </div>
  );
}

// ============ PREVIEW ============

function PreviewSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-[11px] tracking-wider uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          Kucki Development · PyQt5
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-[#fafafa] mb-3">
          Kucki Browser
        </h1>
        <p className="text-[#a1a1aa] text-lg max-w-2xl leading-relaxed">
          Минималистичный десктопный браузер с вкладками, тёмной темой и системой расширений.
          Разработан командой Kucki Development на Python + PyQt5.
        </p>
      </div>

      {/* Browser mockup */}
      <div className="rounded-xl overflow-hidden border border-[#222225] shadow-2xl shadow-black/40">
        {/* Title bar */}
        <div className="bg-[#111113] px-4 py-2.5 flex items-center gap-2 border-b border-[#222225]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 text-center text-[11px] text-[#71717a]">Kucki Browser</div>
        </div>

        {/* Tab bar */}
        <div className="bg-[#111113] flex items-end px-2 pt-1">
          <div className="bg-[#0a0a0c] text-[#fafafa] text-[12px] px-4 py-2 rounded-t-md flex items-center gap-2 border-t-2 border-t-[#10b981]">
            <span className="text-[#10b981]">◉</span> Google
            <span className="text-[#52525b] ml-2 hover:text-[#fafafa] cursor-pointer">×</span>
          </div>
          <div className="text-[#71717a] text-[12px] px-4 py-2 flex items-center gap-2">
            <span>💻</span> GitHub
            <span className="text-[#52525b] ml-2 hover:text-[#fafafa] cursor-pointer">×</span>
          </div>
          <button className="text-[#52525b] hover:text-[#a1a1aa] px-2 py-1 text-sm">+</button>
        </div>

        {/* Toolbar */}
        <div className="bg-[#111113] px-3 py-2 flex items-center gap-1.5 border-b border-[#222225]">
          {['←', '→', '⟳', '⌂'].map((b, i) => (
            <button key={i} className="w-8 h-8 rounded-md text-[#a1a1aa] hover:bg-[#1a1a1d] hover:text-[#fafafa] text-sm">
              {b}
            </button>
          ))}
          <div className="flex-1 bg-[#0a0a0c] border border-[#222225] rounded-md px-3 py-1.5 text-[12px] text-[#a1a1aa] flex items-center gap-2">
            <span className="text-[#10b981]">🔒</span>
            https://www.google.com
          </div>
          <button className="w-8 h-8 rounded-md text-[#a1a1aa] hover:bg-[#1a1a1d] text-sm">⚙</button>
        </div>

        {/* Content */}
        <div className="bg-[#0a0a0c] min-h-[420px] flex flex-col items-center justify-center p-10">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-[#fafafa] text-2xl font-medium mb-2">Google</div>
          <div className="w-full max-w-md bg-[#111113] border border-[#222225] rounded-full px-5 py-3 text-[13px] text-[#71717a] text-center">
            Поиск в Google или введите URL
          </div>
          <div className="flex gap-3 mt-6">
            <div className="bg-[#111113] border border-[#222225] rounded-md px-4 py-2 text-[12px] text-[#a1a1aa]">Поиск в Google</div>
            <div className="bg-[#111113] border border-[#222225] rounded-md px-4 py-2 text-[12px] text-[#a1a1aa]">Мне повезёт!</div>
          </div>
        </div>

        {/* Status bar */}
        <div className="bg-[#111113] border-t border-[#222225] px-4 py-1.5 text-[11px] text-[#52525b]">
          Готово
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '◉', title: 'Вкладки', desc: 'Независимые вкладки с автовосстановлением' },
          { icon: '⧉', title: 'Расширения', desc: 'Модульная система как в Chrome' },
          { icon: '⚙', title: 'Настройки', desc: 'Полная кастомизация интерфейса' },
          { icon: '◐', title: 'Тёмная тема', desc: 'Сдержанная палитра, мягкий контраст' },
          { icon: '⌨', title: 'Горячие клавиши', desc: 'Все основные сочетания из коробки' },
          { icon: '🔒', title: 'Приватность', desc: 'Блокировщик рекламы и Do Not Track' },
        ].map((f, i) => (
          <div key={i} className="bg-[#111113] border border-[#222225] rounded-lg p-5 hover:border-[#10b981]/30 transition-colors">
            <div className="text-[#10b981] text-lg mb-3 font-mono">{f.icon}</div>
            <div className="text-[#fafafa] text-sm font-medium mb-1">{f.title}</div>
            <div className="text-[#71717a] text-[13px] leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ EXTENSIONS (chrome://extensions style) ============

function ExtensionsSection({ extensions, enabled, onToggle }: {
  extensions: { id: string; name: string; ver: string; desc: string; icon: string; author: string }[];
  enabled: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = extensions.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] text-[#71717a] tracking-wider uppercase mb-2">kucki://extensions</div>
        <h2 className="text-3xl font-semibold tracking-tight">Расширения</h2>
        <p className="text-[#a1a1aa] text-sm mt-1">Управление расширениями Kucki Browser</p>
      </div>

      {/* Top controls */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525b] text-sm">⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск расширений"
            className="w-full bg-[#111113] border border-[#222225] rounded-md pl-9 pr-4 py-2 text-[13px] text-[#fafafa] placeholder:text-[#52525b] focus:outline-none focus:border-[#10b981]/50"
          />
        </div>
        <button className="bg-[#111113] border border-[#222225] rounded-md px-4 py-2 text-[13px] text-[#fafafa] hover:border-[#10b981]/40 transition-colors">
          + Загрузить распакованное
        </button>
      </div>

      {/* Dev mode toggle */}
      <div className="flex items-center justify-between bg-[#111113] border border-[#222225] rounded-lg p-4">
        <div>
          <div className="text-[13px] text-[#fafafa] font-medium">Режим разработчика</div>
          <div className="text-[12px] text-[#71717a] mt-0.5">Загружать расширения из исходного кода</div>
        </div>
        <Toggle checked={false} onChange={() => {}} />
      </div>

      {/* Extensions list */}
      <div className="space-y-3">
        {filtered.map(ext => (
          <div key={ext.id} className="bg-[#111113] border border-[#222225] rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#0a0a0c] border border-[#222225] flex items-center justify-center text-2xl flex-shrink-0">
                {ext.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[14px] font-medium text-[#fafafa]">{ext.name}</span>
                  <span className="text-[11px] text-[#52525b] font-mono">v{ext.ver}</span>
                </div>
                <div className="text-[12px] text-[#a1a1aa] leading-relaxed mb-2">{ext.desc}</div>
                <div className="flex items-center gap-4 text-[11px] text-[#52525b]">
                  <span>ID: {ext.id}</span>
                  <span>·</span>
                  <span>{ext.author}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button className="text-[#52525b] hover:text-[#fafafa] text-sm px-2 py-1 rounded hover:bg-[#1a1a1d]">⋮</button>
                <Toggle checked={enabled[ext.id]} onChange={() => onToggle(ext.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[#52525b] text-sm">
          Расширения не найдены
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? 'bg-[#10b981]' : 'bg-[#27272a]'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ============ SETTINGS ============

function SettingsSection() {
  const [settingsPage, setSettingsPage] = useState('appearance');

  const pages = [
    { id: 'appearance', label: 'Внешний вид', icon: '◐' },
    { id: 'search', label: 'Поиск', icon: '⌕' },
    { id: 'startup', label: 'Запуск', icon: '▶' },
    { id: 'privacy', label: 'Приватность', icon: '🔒' },
    { id: 'downloads', label: 'Загрузки', icon: '↓' },
    { id: 'languages', label: 'Языки', icon: '🌐' },
    { id: 'about', label: 'О браузере', icon: 'ⓘ' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] text-[#71717a] tracking-wider uppercase mb-2">kucki://settings</div>
        <h2 className="text-3xl font-semibold tracking-tight">Настройки</h2>
        <p className="text-[#a1a1aa] text-sm mt-1">Персонализируйте Kucki Browser под себя</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-56 flex-shrink-0 space-y-0.5">
          {pages.map(p => (
            <button
              key={p.id}
              onClick={() => setSettingsPage(p.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-[13px] flex items-center gap-3 transition-colors ${
                settingsPage === p.id
                  ? 'bg-[#111113] text-[#10b981]'
                  : 'text-[#a1a1aa] hover:bg-[#111113] hover:text-[#fafafa]'
              }`}
            >
              <span className="text-[#52525b] w-4 text-center">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {settingsPage === 'appearance' && <AppearanceSettings />}
          {settingsPage === 'search' && <SearchSettings />}
          {settingsPage === 'startup' && <StartupSettings />}
          {settingsPage === 'privacy' && <PrivacySettings />}
          {settingsPage === 'downloads' && <DownloadsSettings />}
          {settingsPage === 'languages' && <LanguagesSettings />}
          {settingsPage === 'about' && <AboutSettings />}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#1a1a1d]">
      <div className="flex-1 pr-6">
        <div className="text-[13px] text-[#fafafa] font-medium">{title}</div>
        <div className="text-[12px] text-[#71717a] mt-0.5">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-[#111113] border border-[#222225] rounded-md px-3 py-1.5 text-[12px] text-[#fafafa] focus:outline-none focus:border-[#10b981]/50"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function AppearanceSettings() {
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState('14');
  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#fafafa] mb-4">Внешний вид</h3>
      <SettingRow title="Тема" desc="Цветовая схема интерфейса">
        <Select value={theme} options={['Тёмная', 'Светлая', 'Системная']} onChange={setTheme} />
      </SettingRow>
      <SettingRow title="Размер шрифта" desc="Размер текста в интерфейсе браузера">
        <Select value={fontSize} options={['10', '12', '14', '16', '18', '20']} onChange={setFontSize} />
      </SettingRow>
      <SettingRow title="Показывать панель закладок" desc="Отображать закладки под адресной строкой">
        <Toggle checked={true} onChange={() => {}} />
      </SettingRow>
      <SettingRow title="Компактный режим" desc="Уменьшить отступы в интерфейсе">
        <Toggle checked={false} onChange={() => {}} />
      </SettingRow>
    </div>
  );
}

function SearchSettings() {
  const [engine, setEngine] = useState('google');
  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#fafafa] mb-4">Поисковая система</h3>
      <SettingRow title="Поиск по умолчанию" desc="Используется при вводе текста в адресной строке">
        <Select value={engine} options={['Google', 'DuckDuckGo', 'Bing', 'Яндекс']} onChange={setEngine} />
      </SettingRow>
      <SettingRow title="Предлагать поисковые запросы" desc="Показывать подсказки при вводе">
        <Toggle checked={true} onChange={() => {}} />
      </SettingRow>
    </div>
  );
}

function StartupSettings() {
  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#fafafa] mb-4">При запуске</h3>
      <SettingRow title="Восстанавливать вкладки" desc="Открывать предыдущие вкладки при запуске браузера">
        <Toggle checked={true} onChange={() => {}} />
      </SettingRow>
      <SettingRow title="Домашняя страница" desc="Страница, открываемая при нажатии на кнопку ⌂">
        <Select value="speed-dial" options={['Speed Dial', 'Google', 'Пустая страница']} onChange={() => {}} />
      </SettingRow>
      <SettingRow title="Количество вкладок Speed Dial" desc="Сайтов на стартовой странице">
        <Select value="6" options={['4', '6', '8', '12']} onChange={() => {}} />
      </SettingRow>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#fafafa] mb-4">Конфиденциальность</h3>
      <SettingRow title="Блокировать всплывающие окна" desc="Запретить сайтам открывать попапы">
        <Toggle checked={true} onChange={() => {}} />
      </SettingRow>
      <SettingRow title="Do Not Track" desc="Отправлять запрос DNT посещаемым сайтам">
        <Toggle checked={false} onChange={() => {}} />
      </SettingRow>
      <SettingRow title="Очищать данные при выходе" desc="Удалять cookies, кеш и историю при закрытии">
        <Toggle checked={false} onChange={() => {}} />
      </SettingRow>
      <SettingRow title="Блокировать трекеры" desc="Препятствовать сбору данных о просмотрах">
        <Toggle checked={true} onChange={() => {}} />
      </SettingRow>
      <SettingRow title="Предупреждать о небезопасных сайтах" desc="Показывать предупреждение перед переходом">
        <Toggle checked={true} onChange={() => {}} />
      </SettingRow>
    </div>
  );
}

function DownloadsSettings() {
  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#fafafa] mb-4">Загрузки</h3>
      <SettingRow title="Папка загрузок" desc="Куда сохранять загружаемые файлы">
        <span className="text-[12px] text-[#a1a1aa] font-mono">~/Downloads</span>
      </SettingRow>
      <SettingRow title="Спрашивать перед загрузкой" desc="Подтверждать место сохранения каждого файла">
        <Toggle checked={false} onChange={() => {}} />
      </SettingRow>
    </div>
  );
}

function LanguagesSettings() {
  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#fafafa] mb-4">Языки</h3>
      <SettingRow title="Язык интерфейса" desc="Язык меню и настроек браузера">
        <Select value="ru" options={['Русский', 'English', 'Deutsch']} onChange={() => {}} />
      </SettingRow>
      <SettingRow title="Переводить страницы" desc="Предлагать перевод незнакомых страниц">
        <Toggle checked={true} onChange={() => {}} />
      </SettingRow>
    </div>
  );
}

function AboutSettings() {
  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#fafafa] mb-4">О браузере</h3>
      <div className="bg-[#111113] border border-[#222225] rounded-lg p-6">
        <div className="text-2xl mb-2">🚀</div>
        <div className="text-[15px] font-medium text-[#fafafa] mb-1">Kucki Browser</div>
        <div className="text-[12px] text-[#71717a] space-y-1">
          <div>Версия <span className="text-[#10b981] font-mono">1.0.0</span></div>
          <div>Разработчик: <span className="text-[#a1a1aa]">Kucki Development</span></div>
          <div>Qt <span className="font-mono">5.15.2</span></div>
          <div>Chromium <span className="font-mono">87.0.4280.144</span></div>
          <div>Python <span className="font-mono">3.11</span></div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#1a1a1d] text-[12px] text-[#52525b]">
          © 2026 Kucki Development. Все права защищены.
        </div>
      </div>
    </div>
  );
}

// ============ CODE ============

function CodeSection({ code, reqCode, copied, onCopy }: {
  code: string; reqCode: string; copied: boolean; onCopy: () => void;
}) {
  const [file, setFile] = useState<'main' | 'req'>('main');

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Исходный код</h2>
          <p className="text-[#a1a1aa] text-sm mt-1">Полный код Kucki Browser в одном файле</p>
        </div>
        <button
          onClick={onCopy}
          className="px-4 py-2 rounded-md bg-[#10b981] text-[#0a0a0c] text-[12px] font-medium hover:bg-[#34d399] transition-colors"
        >
          {copied ? '✓ Скопировано' : 'Копировать код'}
        </button>
      </div>

      {/* File tabs */}
      <div className="flex gap-1 bg-[#111113] border border-[#222225] rounded-t-lg p-1 w-fit">
        <button
          onClick={() => setFile('main')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-mono transition-colors ${
            file === 'main' ? 'bg-[#0a0a0c] text-[#fafafa]' : 'text-[#71717a] hover:text-[#a1a1aa]'
          }`}
        >
          kucki_browser.py
        </button>
        <button
          onClick={() => setFile('req')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-mono transition-colors ${
            file === 'req' ? 'bg-[#0a0a0c] text-[#fafafa]' : 'text-[#71717a] hover:text-[#a1a1aa]'
          }`}
        >
          requirements.txt
        </button>
      </div>

      <div className="border border-[#222225] rounded-b-lg overflow-hidden">
        <SyntaxHighlighter
          language={file === 'main' ? 'python' : 'text'}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '20px',
            background: '#0a0a0c',
            fontSize: '12px',
            lineHeight: '1.65',
            borderRadius: '0 0 8px 8px',
          }}
          showLineNumbers
          lineNumberStyle={{ color: '#27272a', paddingRight: '16px' }}
        >
          {file === 'main' ? code : reqCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// ============ SHORTCUTS ============

function ShortcutsSection() {
  const groups = [
    {
      title: 'Вкладки',
      items: [
        ['Ctrl+T', 'Новая вкладка'],
        ['Ctrl+W', 'Закрыть текущую вкладку'],
        ['Ctrl+Tab', 'Следующая вкладка'],
        ['Ctrl+Shift+Tab', 'Предыдущая вкладка'],
        ['Ctrl+Shift+T', 'Восстановить закрытую'],
      ],
    },
    {
      title: 'Навигация',
      items: [
        ['Alt+←', 'Назад'],
        ['Alt+→', 'Вперёд'],
        ['Ctrl+R', 'Обновить страницу'],
        ['Ctrl+L', 'Фокус на адресную строку'],
        ['Ctrl+H', 'Домашняя страница'],
      ],
    },
    {
      title: 'Данные',
      items: [
        ['Ctrl+D', 'Добавить в закладки'],
        ['Ctrl+B', 'Показать закладки'],
        ['Ctrl+J', 'Загрузки'],
        ['Ctrl+Shift+Del', 'Очистить данные'],
      ],
    },
    {
      title: 'Приложение',
      items: [
        ['Ctrl+,', 'Открыть настройки'],
        ['Ctrl+Q', 'Выйти из браузера'],
        ['F11', 'Полноэкранный режим'],
        ['F12', 'Инструменты разработчика'],
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Горячие клавиши</h2>
        <p className="text-[#a1a1aa] text-sm mt-1">Все доступные сочетания клавиш</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((g, i) => (
          <div key={i} className="bg-[#111113] border border-[#222225] rounded-lg p-5">
            <h3 className="text-[12px] text-[#71717a] tracking-wider uppercase mb-4">{g.title}</h3>
            <div className="space-y-2">
              {g.items.map(([keys, action], j) => (
                <div key={j} className="flex items-center justify-between py-1.5">
                  <span className="text-[13px] text-[#a1a1aa]">{action}</span>
                  <kbd className="font-mono text-[11px] bg-[#0a0a0c] border border-[#222225] rounded px-2 py-0.5 text-[#10b981]">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
