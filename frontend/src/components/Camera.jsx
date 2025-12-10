
import { useRef, useEffect, useState} from "react"

export function Camera({setPreview, handleUpload}) {
    const videoRef = useRef(null);
    const [capturedImage, setCapturedImage] = useState(null);

    function captureImage() {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);

        return canvas.toDataURL("image/png") 
    }

    async function handleCapture(){
        const image = captureImage();
        setCapturedImage(image);

        // setPreview(URL.createObjectURL(await(await fetch(image)).blob()))
        const blob = await (await fetch(image)).blob()

        handleUpload([new File([blob], "camera_image.png", {type: blob.type})]);
    }

    useEffect(() => {
        async function enableCamera() {
            try{
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }
            catch (err) {
                console.error("Error accessing camera:", err);
            }
        }

        enableCamera();
    }, []);

    return (
        <div>
            <div className="relative">
                <video
                ref={videoRef}
                autoPlay
                playsInline
                className="border rounded"
                />
                {(capturedImage != null) &&
                    <img className="absolute w-2/10 h-2/10 bottom-2 right-2 border-2" src={capturedImage}></img>
                }
            </div>
            <button className="w-full btn" onClick={handleCapture}>Capture</button>
        </div>
    );
}