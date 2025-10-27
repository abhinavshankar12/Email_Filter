import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { initializeIcons } from '@fluentui/react/lib/Icons';
import { App } from './components/App';

initializeIcons();

let isOfficeInitialized = false;

const render = (Component: React.ComponentType) => {
  ReactDOM.render(<Component />, document.getElementById('root'));
};

/* Render application after Office initializes */
Office.onReady(() => {
  isOfficeInitialized = true;
  render(App);
});

if ((module as any).hot) {
  (module as any).hot.accept('./components/App', () => {
    const NextApp = require('./components/App').App;
    render(NextApp);
  });
}

