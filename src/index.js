let canvas;
let ctx;

const init=()=>{
    if(navigator && navigator.mediaDevices){

        document.addEventListener("DOMContentLoaded", () => {
            let but = document.getElementById("take-pic");
            let video = document.getElementById("vid");
            let mediaDevices = navigator.mediaDevices;
            vid.muted = true;
            but.addEventListener("click", () => {
            
                // Accessing the user camera and video.
                mediaDevices
                    .getUserMedia({
                        video:true,
                        audio:false,
                    })
                    .then((stream) => {
                    
                        // Changing the source of video to current stream.
                        video.srcObject = stream;
                        video.addEventListener("loadedmetadata", () => {
                            video.play();
                        });
                    })
                    .catch(alert);
            });
        });
    }else{console.log('nope.')}
};

window.onload = () =>{
    init();
}

const clickPhoto = () =>{
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
}

