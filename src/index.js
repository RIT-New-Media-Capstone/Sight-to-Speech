const WORD_CONFIDENCE_THRESHOLD = 20;
const HIGHLIGHT_OUTLINE_THICKNESS = 4;

const displayContainerOuter = document.getElementById('mainDisplayContainerOuter');
const displayContainerInner = document.getElementById('mainDisplayContainerInner');
const videoButton = document.getElementById('takePic');
const backButton = document.getElementById('backToCam');
const voiceButton = document.getElementById('speechBtn');
const video = document.getElementById('vid');
let onImgScreen = false;
const hiddenImage = document.createElement('img');
const imgCanvas = document.getElementById('imgCanvas');
const imgCanvasCtx = imgCanvas.getContext('2d');
const errorMessage = document.querySelector('#youGotTrouble');
const setErrorMessage = (message) => errorMessage.innerHTML = message?.toString();
let videoWidth, videoHeight;

const { createWorker, createScheduler } = Tesseract;
const scheduler = createScheduler();

function resizeDisplay() {
    if (!(videoWidth && videoHeight)) return;
    const { offsetWidth, offsetHeight, offsetLeft, offsetTop } = displayContainerOuter;
    const newScale = Math.min(offsetWidth / videoWidth, offsetHeight / videoHeight);
    const newWidth = videoWidth * newScale;
    const newHeight = videoHeight * newScale;
    displayContainerInner.style.width = `${newWidth}px`;
    displayContainerInner.style.height = `${newHeight}px`;
    displayContainerInner.style.left = `${(offsetWidth - newWidth) / 2 + offsetLeft}px`;
    displayContainerInner.style.top = `${(offsetHeight - newHeight) / 2 + offsetTop}px`;
    imgCanvasCtx.strokeStyle = 'red';
    imgCanvasCtx.lineWidth = HIGHLIGHT_OUTLINE_THICKNESS / newScale;
}

videoButton.onclick = (ev) => {
    takePicture();
    ev.preventDefault();
}

backButton.onclick = (ev) => {
    console.log('backtocam clicked')
    clearPhoto();
    ev.preventDefault();
}

// Very quick and dirty method of identifying which camera is the back camera
function deviceIsBackCamera(deviceInfo) {
    return deviceInfo.label.search('back') !== -1 && deviceInfo.kind === 'videoinput';
}

async function init() {
    setErrorMessage('Initializing Tesseract.js');
    const workerCount = 1;
    for (let i = 0; i < workerCount; i++) {
        const worker = createWorker();
        setErrorMessage(`Loading worker (${i + 1}/${workerCount})`);
        await worker.load();
        setErrorMessage(`Loading English (${i + 1}/${workerCount})`);
        await worker.loadLanguage('eng');
        setErrorMessage(`Initializing English (${i + 1}/${workerCount})`);
        await worker.initialize('eng');
        scheduler.addWorker(worker);
    }
    setErrorMessage('Initialized Tesseract.js; awaiting camera');

    try {
        // https://simpl.info/getusermedia/sources/js/main.js
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const backCamera = deviceInfos.find(deviceIsBackCamera);
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: {
                    exact: backCamera ? backCamera.deviceId : deviceInfos[Math.min(deviceInfos.length - 1, 2)].deviceId,
                },
            },
            height: 1080,
            width: 1080
        });
        window.stream = stream;
        video.srcObject = stream;
    } catch (err) {
        setErrorMessage(err);
    }

    setErrorMessage('Ready');
    video.addEventListener('canplay', (event) => {
        videoWidth = video.videoWidth;
        videoHeight = video.videoHeight;
        imgCanvas.width = videoWidth;
        imgCanvas.height = videoHeight;
        resizeDisplay();
    });
}

function clearPhoto() {
    switchState();
    setErrorMessage('Ready');
}

async function takePicture() {
    if (videoWidth && videoHeight) {
        voiceButton.onclick = () => {};
        imgCanvasCtx.drawImage(video, 0, 0);
        hiddenImage.src = imgCanvas.toDataURL('image/png');
        setErrorMessage('Parsing text');
        switchState();

        const paragraphsFiltered = await parseCanvas(imgCanvas);
        console.log(paragraphsFiltered);
        sayIt(paragraphsFiltered);
        voiceButton.onclick = () => sayIt(paragraphsFiltered);
    } else {
        clearPhoto();
    }
}

async function parseCanvas(canvas) {
    const ocrResult = await scheduler.addJob('recognize', canvas);
    console.log(ocrResult);
    const paragraphsFiltered = [];
    const { paragraphs } = ocrResult.data;
    for (let i = 0; i < paragraphs.length; i++) {
        const wordList = [];
        const { lines } = paragraphs[i];
        for (let j = 0; j < lines.length; j++) {
            const { words } = lines[j];
            for (let k = 0; k < words.length; k++) {
                const word = words[k];
                const { confidence, text } = word;
                // https://stackoverflow.com/questions/7349312/how-to-count-the-number-of-letters-in-a-random-string
                const alphaNumericCount = text.replace(/[^0-9A-Za-z]/gi, '').length;
                if (confidence > WORD_CONFIDENCE_THRESHOLD && alphaNumericCount >= text.length - alphaNumericCount) {
                    wordList.push({
                        ...word,
                        symbols: undefined,
                        choices: undefined,
                    });
                }
            }
        }
        if (wordList.length > 0) {
            paragraphsFiltered.push({ wordList });
        }
    }
    return paragraphsFiltered;
}

function sayIt(paragraphsFiltered) {
    const utterances = paragraphsFiltered.map((pgraph, pgraphIndex) => {
        let wordIndex = 0;
        const { wordList } = pgraph;
        const utterance = new SpeechSynthesisUtterance(wordList.map((word) => word.text.replace(/[^0-9A-Za-z\-]/gi, '')).join(' '));
        utterance.onboundary = function (event) {
            if (event.name === 'word') {
                highlightWord(wordList[wordIndex++]);
            }
        };
        utterance.onend = () => {
            if (pgraphIndex >= paragraphsFiltered.length - 1) {
                if (onImgScreen) {
                    highlightWord();
                }
            } else {
                speechSynthesis.speak(utterances[pgraphIndex + 1]);
            }
        }
        return utterance;
    });
    speechSynthesis.cancel();
    speechSynthesis.speak(utterances.length > 0 ? utterances[0] : new SpeechSynthesisUtterance('Please try again'));
}

function highlightWord(word) {
    imgCanvasCtx.drawImage(hiddenImage, 0, 0);
    if (word) {
        const { x0, y0, x1, y1 } = word.bbox;
        imgCanvasCtx.beginPath();
        imgCanvasCtx.rect(x0, y0, x1 - x0, y1 - y0);
        imgCanvasCtx.stroke();
        imgCanvasCtx.closePath();
        setErrorMessage(word.text);
        console.log(word.text);
    } else {
        setErrorMessage('(done)');
        console.log('(done)');
    }
}

function switchState() {
    speechSynthesis.cancel();
    onImgScreen = !onImgScreen;
    if (onImgScreen) {
        imgCanvas.style.display = 'block';
        video.style.display = 'none';
        videoButton.disabled = true;
        videoButton.style.display = 'none';
        voiceButton.disabled = false;
        voiceButton.style.display = 'block';
        backButton.disabled = false;
        backButton.style.display = 'block';
    } else {
        imgCanvas.style.display = 'none';
        video.style.display = 'block';
        videoButton.disabled = false;
        videoButton.style.display = 'block';
        backButton.disabled = true;
        backButton.style.display = 'none';
        voiceButton.disabled = true;
        voiceButton.style.display = 'none';
    }
}

window.onresize = resizeDisplay;

try {
    init();
} catch (e) {
    setErrorMessage(e.toString());
}
