// Meta Ads Library Downloader - service-worker.js
// Recebe a URL do vídeo via mensagem e executa o download.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.action !== "downloadVideo") {
        return false;
    }

    try {
        const url = message.url;

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (error) {
            console.error("[Meta Downloader] URL de vídeo inválida", error);
            return false;
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            console.error("[Meta Downloader] A URL não é um arquivo de vídeo acessível");
            return false;
        }

        if (!url) {
            console.error("[Meta Downloader]", "URL ausente na mensagem de download");
            return false;
        }

        const supportedExtensions = new Set(["mp4", "webm", "mov", "m4v"]);
        const extension = supportedExtensions.has(message.extension) ? message.extension : "mp4";
        const filename = `meta-ad-${Date.now()}.${extension}`;

        chrome.downloads.download(
            {
                url: url,
                filename: filename,
                saveAs: false
            },
            (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error("[Meta Downloader]", chrome.runtime.lastError.message);
                    return;
                }
                console.log("[Meta Downloader] Download iniciado, id:", downloadId);
            }
        );
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }

    return false;
});
