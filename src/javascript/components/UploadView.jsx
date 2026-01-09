import React from 'react';
import Dropzone from 'react-dropzone';

// SVG Icons as components
const UploadIcon = () => (
    <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 16.2091 19.2091 18 17 18H16M12 12V21M12 12L15 15M12 12L9 15" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const FileIcon = () => (
    <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2V8H20" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const CloseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export default class UploadView extends React.Component {

    static propTypes = {
        storeFilesFunction: React.PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            selectedFiles: [],
            isDragActive: false
        };
    }

    onDrop(acceptedFiles) {
        // Filter for PDF files only
        const pdfFiles = acceptedFiles.filter(file => 
            file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        );
        
        if (pdfFiles.length === 0) {
            alert('Please upload PDF files only.');
            return;
        }

        this.setState(prevState => ({
            selectedFiles: [...prevState.selectedFiles, ...pdfFiles],
            isDragActive: false
        }));
    }

    removeFile(index) {
        this.setState(prevState => ({
            selectedFiles: prevState.selectedFiles.filter((_, i) => i !== index)
        }));
    }

    clearAllFiles() {
        this.setState({ selectedFiles: [] });
    }

    startConversion() {
        if (this.state.selectedFiles.length > 0) {
            this.props.storeFilesFunction(this.state.selectedFiles);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    render() {
        const { selectedFiles, isDragActive } = this.state;
        const hasFiles = selectedFiles.length > 0;

        return (
            <div>
                <Dropzone 
                    onDrop={ this.onDrop.bind(this) } 
                    multiple={ true }
                    accept="application/pdf"
                    onDragEnter={() => this.setState({ isDragActive: true })}
                    onDragLeave={() => this.setState({ isDragActive: false })}
                    style={{}}
                >
                    <div className={`dropzone ${isDragActive ? 'active' : ''}`}>
                        <UploadIcon />
                        <h2 className="dropzone-title">
                            { isDragActive ? 'Drop your files here' : 'Drag & drop PDF files here' }
                        </h2>
                        <p className="dropzone-subtitle">
                            or click to browse • Supports multiple files
                        </p>
                    </div>
                </Dropzone>

                { hasFiles && (
                    <div className="file-list">
                        { selectedFiles.map((file, index) => (
                            <div key={index} className="file-item">
                                <div className="file-info">
                                    <FileIcon />
                                    <div>
                                        <div className="file-name">{ file.name }</div>
                                        <div className="file-size">{ this.formatFileSize(file.size) }</div>
                                    </div>
                                </div>
                                <button 
                                    className="file-remove"
                                    onClick={() => this.removeFile(index)}
                                    title="Remove file"
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                { hasFiles && (
                    <div className="btn-group">
                        <button 
                            className="btn btn-secondary"
                            onClick={ this.clearAllFiles.bind(this) }
                        >
                            Clear All
                        </button>
                        <button 
                            className="btn btn-primary"
                            onClick={ this.startConversion.bind(this) }
                        >
                            Convert {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
                        </button>
                    </div>
                )}
            </div>
        );
    }
}