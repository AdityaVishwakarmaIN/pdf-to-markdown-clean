import React from 'react';
const pdfjs = require('pdfjs-dist');

import Metadata from '../models/Metadata.jsx';
import Page from '../models/Page.jsx';
import TextItem from '../models/TextItem.jsx';

pdfjs.GlobalWorkerOptions.workerSrc = 'bundle.worker.js';

// Check icon SVG
const CheckIcon = () => (
    <svg className="progress-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// Parses the PDF pages and displays progress
export default class LoadingView extends React.Component {

    static propTypes = {
        fileBuffer: React.PropTypes.object,
        storePdfPagesFunction: React.PropTypes.func.isRequired,
        files: React.PropTypes.array,
        currentFileIndex: React.PropTypes.number,
        overallProgress: React.PropTypes.number,
    };

    constructor(props) {
        super(props);

        const progress = new Progress({
            stages: [
                new ProgressStage('Parsing Metadata', 2),
                new ProgressStage('Parsing Pages'),
                new ProgressStage('Parsing Fonts', 0)
            ]
        });
        Progress.prototype.metadataStage = () => progress.stages[0];
        Progress.prototype.pageStage = () => progress.stages[1];
        Progress.prototype.fontStage = () => progress.stages[2];
        
        this.state = {
            document: null,
            metadata: null,
            pages: [],
            fontIds: new Set(),
            fontMap: new Map(),
            progress: progress,
        };
    }

    documentParsed(document) {
        const metadataStage = this.state.progress.metadataStage();
        const pageStage = this.state.progress.pageStage();
        metadataStage.stepsDone++;

        const numPages = document.numPages;
        pageStage.steps = numPages;

        var pages = [];
        for (var i = 0; i < numPages; i++) {
            pages.push(new Page({ index: i }));
        }

        this.setState({
            document: document,
            pages: pages,
        });
    }

    metadataParsed(metadata) {
        const metadataStage = this.state.progress.metadataStage();
        metadataStage.stepsDone++;
        this.setState({
            metadata: new Metadata(metadata),
        });
    }

    pageParsed(index, textItems) {
        const pageStage = this.state.progress.pageStage();
        pageStage.stepsDone = pageStage.stepsDone + 1;
        this.state.pages[index].items = textItems;
        this.setState({
            progress: this.state.progress
        });
    }

    fontParsed(fontId, font) {
        const fontStage = this.state.progress.fontStage();
        this.state.fontMap.set(fontId, font);
        fontStage.stepsDone++;
        if (this.state.progress.activeStage() === fontStage) {
            this.setState({
                fontMap: this.state.fontMap,
            });
        }
    }

    componentWillMount() {
        if (!this.props.fileBuffer) return;
        
        const self = this;
        const fontStage = this.state.progress.fontStage();

        pdfjs.getDocument({
            data: this.props.fileBuffer,
            cMapUrl: 'cmaps/',
            cMapPacked: true
        }).promise.then(function(pdfDocument) {
            pdfDocument.getMetadata().then(function(metadata) {
                self.metadataParsed(metadata);
            });
            self.documentParsed(pdfDocument);
            for (var j = 1; j <= pdfDocument.numPages; j++) {
                pdfDocument.getPage(j).then(function(page) {
                    var scale = 1.0;
                    var viewport = page.getViewport({scale: scale});

                    page.getTextContent().then(function(textContent) {
                        const textItems = textContent.items.map(function(item) {
                            const fontId = item.fontName;
                            if (!self.state.fontIds.has(fontId) && fontId.startsWith('g_d0')) {
                                self.state.document._transport.commonObjs.get(fontId, function(font) {
                                    self.fontParsed(fontId, font);
                                });
                                self.state.fontIds.add(fontId);
                                fontStage.steps = self.state.fontIds.size;
                            }

                            const tx = pdfjs.Util.transform(
                                viewport.transform,
                                item.transform
                            );

                            const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
                            const dividedHeight = item.height / fontHeight;
                            return new TextItem({
                                x: Math.round(item.transform[4]),
                                y: Math.round(item.transform[5]),
                                width: Math.round(item.width),
                                height: Math.round(dividedHeight <= 1 ? item.height : dividedHeight),
                                text: item.str,
                                font: item.fontName
                            });
                        });
                        self.pageParsed(page._pageIndex, textItems);
                    });
                    page.getOperatorList().then(function() {
                        // Trigger font retrieval
                    });
                });
            }
        });
    }

    componentWillReceiveProps(nextProps) {
        // Reset state when fileBuffer changes (new file to process)
        if (nextProps.fileBuffer && nextProps.fileBuffer !== this.props.fileBuffer) {
            const progress = new Progress({
                stages: [
                    new ProgressStage('Parsing Metadata', 2),
                    new ProgressStage('Parsing Pages'),
                    new ProgressStage('Parsing Fonts', 0)
                ]
            });
            Progress.prototype.metadataStage = () => progress.stages[0];
            Progress.prototype.pageStage = () => progress.stages[1];
            Progress.prototype.fontStage = () => progress.stages[2];
            
            this.setState({
                document: null,
                metadata: null,
                pages: [],
                fontIds: new Set(),
                fontMap: new Map(),
                progress: progress,
            }, () => {
                this.startParsing(nextProps.fileBuffer);
            });
        }
    }

    startParsing(fileBuffer) {
        const self = this;
        const fontStage = this.state.progress.fontStage();

        pdfjs.getDocument({
            data: fileBuffer,
            cMapUrl: 'cmaps/',
            cMapPacked: true
        }).promise.then(function(pdfDocument) {
            pdfDocument.getMetadata().then(function(metadata) {
                self.metadataParsed(metadata);
            });
            self.documentParsed(pdfDocument);
            for (var j = 1; j <= pdfDocument.numPages; j++) {
                pdfDocument.getPage(j).then(function(page) {
                    var scale = 1.0;
                    var viewport = page.getViewport({scale: scale});

                    page.getTextContent().then(function(textContent) {
                        const textItems = textContent.items.map(function(item) {
                            const fontId = item.fontName;
                            if (!self.state.fontIds.has(fontId) && fontId.startsWith('g_d0')) {
                                self.state.document._transport.commonObjs.get(fontId, function(font) {
                                    self.fontParsed(fontId, font);
                                });
                                self.state.fontIds.add(fontId);
                                fontStage.steps = self.state.fontIds.size;
                            }

                            const tx = pdfjs.Util.transform(
                                viewport.transform,
                                item.transform
                            );

                            const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
                            const dividedHeight = item.height / fontHeight;
                            return new TextItem({
                                x: Math.round(item.transform[4]),
                                y: Math.round(item.transform[5]),
                                width: Math.round(item.width),
                                height: Math.round(dividedHeight <= 1 ? item.height : dividedHeight),
                                text: item.str,
                                font: item.fontName
                            });
                        });
                        self.pageParsed(page._pageIndex, textItems);
                    });
                    page.getOperatorList().then(function() {
                        // Trigger font retrieval
                    });
                });
            }
        });
    }

    render() {
        const { pages, fontMap, metadata, progress } = this.state;
        const { files, currentFileIndex, overallProgress } = this.props;
        
        const percentDone = getPercentDone(progress);
        
        if (percentDone == 100) {
            this.props.storePdfPagesFunction(metadata, fontMap, pages);
        }

        const currentFileName = files && files[currentFileIndex] 
            ? files[currentFileIndex].name 
            : 'Processing...';
        
        const totalFiles = files ? files.length : 1;
        const fileProgress = currentFileIndex + 1;

        const stageItems = progress.stages.filter((elem, i) => i <= progress.currentStage).map((stage, i) => {
            const progressDetails = stage.steps ? stage.stepsDone + ' / ' + stage.steps : '';
            const checkmark = stage.isComplete() ? <CheckIcon /> : '';
            return (
                <div key={i} className="progress-stage">
                    <span>{ stage.name }</span>
                    <span>{ progressDetails }</span>
                    { checkmark }
                </div>
            );
        });

        return (
            <div className="progress-container">
                <h2 className="progress-title">Converting your files...</h2>
                
                { totalFiles > 1 && (
                    <div className="progress-text" style={{ marginBottom: '16px' }}>
                        File {fileProgress} of {totalFiles}: <strong>{currentFileName}</strong>
                    </div>
                )}
                
                <div className="progress-bar-wrapper">
                    <div 
                        className="progress-bar" 
                        style={{ width: `${totalFiles > 1 ? overallProgress : percentDone}%` }}
                    />
                </div>
                
                <div className="progress-text">
                    { Math.round(percentDone) }% complete
                </div>
                
                <div style={{ marginTop: '16px' }}>
                    { stageItems }
                </div>
            </div>
        );
    }
}

function getPercentDone(progress) {
    const activeStage = progress.activeStage();
    const percentDone = activeStage.percentDone();

    if (percentDone == 100) {
        progress.completeStage();
        if (!progress.isComplete()) {
            return getPercentDone(progress, 0);
        }
    }

    return percentDone;
}

class Progress {
    constructor(options) {
        this.stages = options.stages;
        this.currentStage = 0;
    }

    completeStage() {
        this.currentStage++;
    }

    isComplete() {
        return this.currentStage == this.stages.length;
    }

    activeStage() {
        return this.stages[this.currentStage];
    }
}

class ProgressStage {
    constructor(name, steps) {
        this.name = name;
        this.steps = steps;
        this.stepsDone = 0;
    }

    isComplete() {
        return this.stepsDone == this.steps;
    }

    percentDone() {
        if (typeof this.steps === 'undefined') {
            return 0;
        }
        if (this.steps == 0) {
            return 100;
        }
        return this.stepsDone / this.steps * 100;
    }
}
