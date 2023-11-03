const WORD_CONFIDENCE_THRESHOLD = 20;

const videoButton = document.getElementById('take-pic');
const backButton = document.getElementById('back-to-cam');
const video = document.getElementById('vid');
const imgCanvas = document.getElementById('imgCanvas');
const image = document.getElementById('myImage');
const errorMessage = document.querySelector("#you-got-trouble");
const setErrorMessage = (message) => errorMessage.innerHTML = message?.toString();
let height = 640;
let width = 0;
let streaming = false;

const { createWorker, createScheduler } = Tesseract;
const scheduler = createScheduler();

videoButton.onclick = (ev) => {
    takePicture();
    ev.preventDefault();
}

backButton.onclick = (ev) => {
    clearPhoto();
    ev.preventDefault();
}

// Very quick and dirty method of identifying which camera is the back camera
function deviceIsBackCamera(deviceInfo) {
    return deviceInfo.label.search("back") !== -1 && deviceInfo.kind === "videoinput";
}

async function init() {
    setErrorMessage("Initializing Tesseract.js");
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
    setErrorMessage("Initialized Tesseract.js; awaiting camera");

    try {
        // https://simpl.info/getusermedia/sources/js/main.js
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const backCamera = deviceInfos.find(deviceIsBackCamera);
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: backCamera ? {
                    exact: backCamera.deviceId,
                } : undefined,
            },
            height: 1080,
            width: 1080
        });
        window.stream = stream;
        video.srcObject = stream;
    } catch (err) {
        setErrorMessage(err);
    }

    setErrorMessage("Ready");
    video.addEventListener('canplay', (event) => {
        if (!streaming) {
            width = video.videoWidth / (video.videoHeight / height);

            if (isNaN(width)) width = height / (4 / 3);
        }
    });
}

function clearPhoto() {
    let context = imgCanvas.getContext('2d');
    imgCanvas.style.display = 'none';
    video.style.display = 'block';
    videoButton.disabled = false;
    videoButton.style.backgroundColor = 'aquamarine';
    videoButton.style.display = 'block';
    backButton.style.display = 'none';
    let data = imgCanvas.toDataURL('image/png');
    image.setAttribute('src', data);
    setErrorMessage("Ready");
}

async function takePicture() {
    let context = imgCanvas.getContext('2d');
    if (width && height) {
        imgCanvas.width = width;
        imgCanvas.height = height;
        video.style.display = 'none';
        imgCanvas.style.display = 'block';
        backButton.style.display = 'block';
        videoButton.disabled = true;
        videoButton.style.display = 'none';
        backButton.disabled = false;
        videoButton.style.backgroundColor = 'grey';
        context.drawImage(video, 0, 0, width, height);
        let data = imgCanvas.toDataURL('image/png');
        image.setAttribute('src', data);
        setErrorMessage("Parsing text");

        const paragraphsFiltered = await parseCanvas(imgCanvas);
        console.log(paragraphsFiltered);
        setErrorMessage(paragraphsFiltered.map(pgraph => pgraph.wordList.map(word => word.text).join(" ")).join(" / "));
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
                const alphaNumericCount = text.replace(/[^0-9A-Za-z]/gi, "").length;
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

function recordVideo(event) {
    if (event) {
        setErrorMessage(event);
        video.srcObject = null;
        let pictureDay = document.querySelector("picture-day");
        let newImage = document.createElement("img");
        newImage.src = URL.createObjectURL(event);
        pictureDay.appendChild(newImage);
        video.src = videoUrl;
    }
}

window.onload = () => {
    try {
        init();
    } catch (e) {
        setErrorMessage(e.toString());
    }
}