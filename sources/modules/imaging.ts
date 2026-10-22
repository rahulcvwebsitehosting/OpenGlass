export function rotateImage(src: Uint8Array, angle: '90' | '180' | '270') {
    return new Promise<Uint8Array>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(new Blob([src], { type: 'image/jpeg' }));
        const fail = (error: unknown) => { URL.revokeObjectURL(url); reject(error); };
        img.onerror = () => fail(new Error('Could not decode the captured image.'));
        img.onload = () => {
            URL.revokeObjectURL(url);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = angle === '180' ? img.width : img.height;
                canvas.height = angle === '180' ? img.height : img.width;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Image processing is unavailable in this browser.');
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(Number(angle) * Math.PI / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                canvas.toBlob(blob => {
                    if (!blob) { reject(new Error('Failed to rotate image.')); return; }
                    blob.arrayBuffer().then(bytes => resolve(new Uint8Array(bytes)), reject);
                }, 'image/jpeg');
            } catch (error) { fail(error); }
        };
        img.src = url;
    });
}
