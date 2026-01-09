import React from 'react';

import '../../css/styles.css';

import { View } from '../models/AppState.jsx';
import UploadView from './UploadView.jsx';
import LoadingView from './LoadingView.jsx';
import ResultView from './ResultView.jsx';

export default class App extends React.Component {

    static propTypes = {
        appState: React.PropTypes.object.isRequired,
    };

    render() {
        const appState = this.props.appState;

        var mainView;
        switch (appState.mainView) {
        case View.UPLOAD:
            mainView = <UploadView storeFilesFunction={ appState.storeFiles } />;
            break;
        case View.LOADING:
            mainView = <LoadingView 
                key={ appState.currentFileIndex }
                fileBuffer={ appState.fileBuffer } 
                storePdfPagesFunction={ appState.storePdfPages }
                files={ appState.files }
                currentFileIndex={ appState.currentFileIndex }
                overallProgress={ appState.overallProgress }
            />;
            break;
        case View.RESULT:
            mainView = <ResultView 
                files={ appState.files }
                resetFunction={ appState.reset }
            />;
            break;
        default:
            throw `View ${appState.mainView} not supported!`;
        }

        return (
            <div className="app-container">
                <header className="app-header">
                    <h1 className="app-logo">PDF → Markdown</h1>
                    <p className="app-tagline">Convert your PDFs to clean Markdown files</p>
                </header>
                { mainView }
            </div>
        );
    }
}
