// Load the Google API client library
function loadGapi() {
    const script = document.createElement('script');
    script.src = "https://apis.google.com/js/api.js";
    script.onload = initGapi;
    document.body.appendChild(script);
}

// Initialize the Google API client
function initGapi() {
    gapi.load('client:auth2', async () => {
        await gapi.client.init({
            apiKey: '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', // optional for some calls
            clientId: '70576401658-28hisqk7nuaj79atur7mi84h21b2r3ad.apps.googleusercontent.com',
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            scope: 'https://www.googleapis.com/auth/drive.file'
        });
        console.log('Google API initialized');
    });
}

// Sign in the user
async function signIn() {
    try {
        await gapi.auth2.getAuthInstance().signIn();
        alert("Signed in to Google Drive!");
    } catch (error) {
        console.error("Error signing in:", error);
    }
}

// Upload a file to Google Drive
async function uploadToDrive(file, folderId = null) {
    const metadata = {
        name: file.name,
        mimeType: file.type
    };
    if (folderId) {
        metadata.parents = [folderId]; // Upload to a specific folder
    }

    const accessToken = gapi.auth.getToken().access_token;
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
            {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + accessToken },
                body: form
            }
        );
        const data = await response.json();
        console.log("Uploaded file:", data);
        alert(`Uploaded: ${data.name}`);
        return data.id;
    } catch (error) {
        console.error("Upload failed:", error);
    }
}

// List files in Google Drive
async function listFiles(folderId = null) {
    let query = '';
    if (folderId) {
        query = `'${folderId}' in parents`;
    }

    try {
        const response = await gapi.client.drive.files.list({
            pageSize: 100,
            fields: "files(id, name, mimeType)",
            q: query
        });
        console.log("Files:", response.result.files);
        displayFiles(response.result.files);
    } catch (error) {
        console.error("Error listing files:", error);
    }
}

// Display files in the PWA
function displayFiles(files) {
    const docList = document.getElementById('docList');
    docList.innerHTML = "<h3>Documents</h3>";
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'doc-item';
        div.innerText = file.name;
        docList.appendChild(div);
    });
}

// Handle file input
async function handleFileUpload(inputElement, folderId = null) {
    const file = inputElement.files[0];
    if (file) {
        await uploadToDrive(file, folderId);
        listFiles(folderId);
        inputElement.value = "";
    } else {
        alert("Please select a file to upload.");
    }
}

// Call this function when your page loads
window.onload = () => {
    loadGapi();
};
