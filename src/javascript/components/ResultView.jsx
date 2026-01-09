import React from 'react';
import JSZip from 'jszip';

// SVG Icons
const SuccessIcon = () => (
    <svg className="results-success-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="7,10 12,15 17,10" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ChevronIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6,9 12,15 18,9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const FileTextIcon = () => (
    <svg className="result-file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ZipIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export default class ResultView extends React.Component {

    static propTypes = {
        files: React.PropTypes.array.isRequired,
        resetFunction: React.PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            dropdownOpen: false
        };
        // this.dropdownRef = null; // unnecessary to init here but good practice
    }

    componentDidMount() {
        document.addEventListener('click', this.handleClickOutside.bind(this));
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.handleClickOutside.bind(this));
    }

    handleClickOutside(event) {
        if (this.dropdownRef && !this.dropdownRef.contains(event.target)) {
            this.setState({ dropdownOpen: false });
        }
    }

    toggleDropdown() {
        this.setState(prev => ({ dropdownOpen: !prev.dropdownOpen }));
    }

    getMarkdownFilename(pdfName) {
        return pdfName.replace(/\.pdf$/i, '.md');
    }

    downloadSingleFile(file) {
        const markdown = file.markdown;
        const filename = this.getMarkdownFilename(file.name);
        this.triggerDownload(markdown, filename, 'text/markdown');
    }

    downloadAllIndividual() {
        const { files } = this.props;
        files.forEach(file => {
            this.downloadSingleFile(file);
        });
        this.setState({ dropdownOpen: false });
    }

    async downloadAllAsZip() {
        const { files } = this.props;
        const zip = new JSZip();
        
        files.forEach(file => {
            const filename = this.getMarkdownFilename(file.name);
            zip.file(filename, file.markdown);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        this.triggerDownload(content, 'markdown-files.zip', 'application/zip');
        this.setState({ dropdownOpen: false });
    }

    triggerDownload(content, filename, mimeType) {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    render() {
        const { files, resetFunction } = this.props;
        const { dropdownOpen } = this.state;
        const hasMultipleFiles = files.length > 1;

        return (
            <div className="results-container">
                <div className="results-header">
                    <h2 className="results-title">
                        <SuccessIcon />
                        Conversion Complete!
                    </h2>
                    
                    { hasMultipleFiles && (
                        <div className="dropdown-wrapper" ref={ (node) => this.dropdownRef = node }>
                            <button 
                                className="dropdown-toggle"
                                onClick={ this.toggleDropdown.bind(this) }
                            >
                                <DownloadIcon />
                                Download All
                                <ChevronIcon />
                            </button>
                            <div className={`dropdown-menu ${dropdownOpen ? 'open' : ''}`}>
                                <button 
                                    className="dropdown-item"
                                    onClick={ this.downloadAllIndividual.bind(this) }
                                >
                                    <DownloadIcon />
                                    Individual .md files
                                </button>
                                <div className="dropdown-divider" />
                                <button 
                                    className="dropdown-item"
                                    onClick={ this.downloadAllAsZip.bind(this) }
                                >
                                    <ZipIcon />
                                    All as ZIP
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="result-file-list">
                    { files.map((file, index) => (
                        <div key={index} className="result-file-item">
                            <div className="result-file-info">
                                <FileTextIcon />
                                <span className="result-file-name">
                                    { this.getMarkdownFilename(file.name) }
                                </span>
                            </div>
                            <button 
                                className="result-download-btn"
                                onClick={ () => this.downloadSingleFile(file) }
                            >
                                <DownloadIcon />
                                Download
                            </button>
                        </div>
                    ))}
                </div>

                <div className="reset-section">
                    <button 
                        className="reset-link"
                        onClick={ resetFunction }
                    >
                        Convert more files
                    </button>
                </div>
            </div>
        );
    }
}