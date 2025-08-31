const CLIENT_ID = "70576401658-28hisqk7nuaj79atur7mi84h21b2r3ad.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let tokenClient;
let gapiInited = false;
let gisInited = false;
let selectedSection = null;

// ---------------- Google API ----------------
function gapiLoaded() {
  gapi.load("client", async () => {
    await gapi.client.init({
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    });
    gapiInited = true;
    console.log("✅ Google API initialized");
  });
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) console.error(resp);
      else {
        console.log("🎉 Signed in!");
        alert("Signed in with Google!");
      }
    },
  });
  gisInited = true;
  console.log("✅ GIS initialized");
}

function handleSignIn() {
  if (!gapiInited || !gisInited) {
    alert("Google API not initialized yet!");
    return;
  }
  tokenClient.requestAccessToken();
}

// ---------------- Section ----------------
function selectSection(section) {
  selectedSection = section;
  alert("Selected section: " + section);
  listFiles(section);
}

// ---------------- File Upload ----------------
async function handleUpload() {
  if (!selectedSection) { alert("Select a section first!"); return; }

  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length === 0) { alert("Select at least one file!"); return; }

  const accessToken = gapi.client.getToken()?.access_token;
  if (!accessToken) { alert("Sign in first!"); return; }

  for (let i = 0; i < fileInput.files.length; i++) {
    const file = fileInput.files[i];

    // Find or create folder
    const folderId = await getOrCreateFolder(selectedSection);

    const metadata = { name: file.name, parents: [folderId], mimeType: file.type };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken },
      body: form,
    });
    const data = await res.json();
    console.log("Uploaded:", data);
  }

  alert("Upload complete!");
  listFiles(selectedSection); // refresh file list
}

// ---------------- Folder Management ----------------
async function getOrCreateFolder(folderName) {
  const q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await gapi.client.drive.files.list({ q, fields: "files(id, name)" });

  if (res.result.files.length > 0) return res.result.files[0].id;

  const createRes = await gapi.client.drive.files.create({
    resource: { name: folderName, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return createRes.result.id;
}

// ---------------- List Files ----------------
async function listFiles(section) {
  const container = document.getElementById("filesContainer");
  container.innerHTML = "Loading files...";

  const folderId = await getOrCreateFolder(section);
  const res = await gapi.client.drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, webViewLink)"
  });

  container.innerHTML = "";
  if (res.result.files.length === 0) {
    container.innerHTML = `<p>No files in ${section}.</p>`;
    return;
  }

  res.result.files.forEach(file => {
    const div = document.createElement("div");
    div.className = "doc-item";
    div.innerHTML = `<a href="${file.webViewLink}" target="_blank">${file.name}</a>`;
    container.appendChild(div);
  });
}
