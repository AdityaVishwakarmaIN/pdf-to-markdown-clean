import { Enum } from 'enumify';

import CalculateGlobalStats from './transformations/textitem/CalculateGlobalStats.jsx';

import CompactLines from './transformations/lineitem/CompactLines.jsx';
import RemoveRepetitiveElements from './transformations/lineitem/RemoveRepetitiveElements.jsx'
import VerticalToHorizontal from './transformations/lineitem/VerticalToHorizontal.jsx';
import DetectTOC from './transformations/lineitem/DetectTOC.jsx'
import DetectListItems from './transformations/lineitem/DetectListItems.jsx'
import DetectHeaders from './transformations/lineitem/DetectHeaders.jsx'

import GatherBlocks from './transformations/textitemblock/GatherBlocks.jsx'
import DetectCodeQuoteBlocks from './transformations/textitemblock/DetectCodeQuoteBlocks.jsx'
import DetectListLevels from './transformations/textitemblock/DetectListLevels.jsx'
import ToTextBlocks from './transformations/ToTextBlocks.jsx';
import ToMarkdown from './transformations/ToMarkdown.jsx'

// Holds the state of the Application
export default class AppState {

    constructor(options) {
        this.renderFunction = options.renderFunction;
        this.mainView = View.UPLOAD;
        
        // Multi-file support
        this.files = []; // [{name, buffer, status, markdown, metadata, pages, fontMap}]
        this.currentFileIndex = 0;
        this.overallProgress = 0;
        
        // Legacy single-file support (for internal processing)
        this.fileBuffer = null;
        this.metadata = null;
        this.pages = [];
        this.transformations = null;

        // Bind functions
        this.render = this.render.bind(this);
        this.storeFiles = this.storeFiles.bind(this);
        this.storeFileBuffer = this.storeFileBuffer.bind(this);
        this.storePdfPages = this.storePdfPages.bind(this);
        this.processNextFile = this.processNextFile.bind(this);
        this.reset = this.reset.bind(this);
        this.getMarkdownForFile = this.getMarkdownForFile.bind(this);
    }

    render() {
        this.renderFunction(this);
    }

    // Store multiple files from upload
    storeFiles(fileList) {
        this.files = fileList.map(file => ({
            name: file.name,
            buffer: null,
            status: 'pending', // pending, loading, processing, done, error
            markdown: '',
            metadata: null,
            pages: [],
            fontMap: new Map()
        }));
        this.currentFileIndex = 0;
        this.overallProgress = 0;
        this.mainView = View.LOADING;
        this.render();
        
        // Start reading files
        this.readFileBuffers(fileList);
    }

    readFileBuffers(fileList) {
        const self = this;
        let filesRead = 0;
        
        fileList.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                self.files[index].buffer = new Uint8Array(evt.target.result);
                filesRead++;
                
                if (filesRead === fileList.length) {
                    // All files read, start processing
                    self.processNextFile();
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    processNextFile() {
        if (this.currentFileIndex >= this.files.length) {
            // All files processed
            this.mainView = View.RESULT;
            this.render();
            return;
        }

        const currentFile = this.files[this.currentFileIndex];
        currentFile.status = 'loading';
        this.fileBuffer = currentFile.buffer;
        this.mainView = View.LOADING;
        this.render();
    }

    // Legacy single-file upload (still used internally)
    storeFileBuffer(fileBuffer) {
        this.fileBuffer = fileBuffer;
        this.mainView = View.LOADING;
        this.render();
    }

    storePdfPages(metadata, fontMap, pages) {
        const currentFile = this.files[this.currentFileIndex];
        
        if (currentFile) {
            currentFile.metadata = metadata;
            currentFile.pages = pages;
            currentFile.fontMap = fontMap;
            currentFile.status = 'processing';
            
            // Generate markdown for this file
            currentFile.markdown = this.generateMarkdown(pages, fontMap);
            currentFile.status = 'done';
            
            // Update overall progress
            this.overallProgress = ((this.currentFileIndex + 1) / this.files.length) * 100;
            
            // Move to next file
            this.currentFileIndex++;
            this.fileBuffer = null;
            
            // Process next or show results
            this.processNextFile();
        } else {
            // Single file mode (legacy)
            this.metadata = metadata;
            this.pages = pages;
            this.fileBuffer = null;
            this.mainView = View.RESULT;
            
            this.transformations = this.createTransformations(fontMap);
            this.render();
        }
    }

    createTransformations(fontMap) {
        return [
            new CalculateGlobalStats(fontMap),
            new CompactLines(),
            new RemoveRepetitiveElements(),
            new VerticalToHorizontal(),
            new DetectTOC(),
            new DetectHeaders(),
            new DetectListItems(),

            new GatherBlocks(),
            new DetectCodeQuoteBlocks(),
            new DetectListLevels(),

            new ToTextBlocks(),
            new ToMarkdown()
        ];
    }

    generateMarkdown(pages, fontMap) {
        const ParseResult = require('./ParseResult.jsx').default;
        const transformations = this.createTransformations(fontMap);
        
        var parseResult = new ParseResult({ pages: pages });
        var lastTransformation;
        
        transformations.forEach(transformation => {
            if (lastTransformation) {
                parseResult = lastTransformation.completeTransform(parseResult);
            }
            parseResult = transformation.transform(parseResult);
            lastTransformation = transformation;
        });

        var text = '';
        parseResult.pages.forEach(page => {
            page.items.forEach(item => {
                text += item + '\n';
            });
        });
        
        return text;
    }

    getMarkdownForFile(index) {
        if (index >= 0 && index < this.files.length) {
            return this.files[index].markdown;
        }
        return '';
    }

    reset() {
        this.files = [];
        this.currentFileIndex = 0;
        this.overallProgress = 0;
        this.fileBuffer = null;
        this.metadata = null;
        this.pages = [];
        this.transformations = null;
        this.mainView = View.UPLOAD;
        this.render();
    }
}

export class View extends Enum {
}
View.initEnum(['UPLOAD', 'LOADING', 'RESULT'])