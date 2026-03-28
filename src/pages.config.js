import Home from './pages/Home';
import Diagnose from './pages/Diagnose';
import History from './pages/History';
import Settings from './pages/Settings';
import Manuals from './pages/Manuals';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Home":     Home,
    "Diagnose": Diagnose,
    "History":  History,
    "Settings": Settings,
    "Manuals":  Manuals,
}

export const pagesConfig = {
    mainPage: "Diagnose",
    Pages: PAGES,
    Layout: __Layout,
};
