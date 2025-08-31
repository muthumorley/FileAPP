const CLIENT_ID = "70576401658-28hisqk7nuaj79atur7mi84h21b2r3ad.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Called when api.js loads
function gapiLoaded() {
  console.log("✅ gapiLoaded() called");
  if (typeof gapi === "undefined") {
    console.error("❌ gapi not found!");
    return;
  }
  gapi.load("client", async () => {
    console.log("ℹ️ gapi.load('client') triggered");
    try {
      await gapi.client.init({
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
      });
      gapiInited = true;
      console.log("✅ Google API client initialized");
    } catch (err) {
      console.error("❌ GAPI init failed:", err);
    }
  });
}

// Called when gsi/client loads
function gisLoaded() {
  console.log("✅ gisLoaded() called");
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) {
        console.error("❌ Sign-in error", resp);
        return;
      }
      console.log("🎉 Signed in successfully!");
      alert("Signed in with Google!");
    },
  });
  gisInited = true;
  console.log("✅ Google Identity Services initialized");
}

// Trigger Sign-in
function handleSignIn() {
  console.log("👉 handleSignIn clicked");
  console.log("gapiInited:", gapiInited, "gisInited:", gisInited);

  if (!gapiInited || !gisInited) {
    alert("Google API not initialized yet!");
    return;
  }
  tokenClient.requestAccessToken();
}
let selectedSection = null;

function selectSection(section) {
  selectedSection = section;
  alert("Selected section: " + section);
  listFiles(section); // display uploaded files
}


async function handleUpload() {
  if (!selectedSection) {
    alert("Please select a section first!");
    return;
  }

  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length === 0) {
    alert("Please select a file first!");
    return;
  }

  const file = fileInput.files[0];

  // Check / Create folder
  const folderName = selectedSection;
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const folderRes = await gapi.client.drive.files.list({ q: query, fields: "files(id, name)" });
  let folderId;

  if (folderRes.result.files.length > 0) {
    folderId = folderRes.result.files[0].id;
  } else {
    const createFolderRes = await gapi.client.drive.files.create({
      resource: { name: folderName, mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    folderId = createFolderRes.result.id;
  }

  // Upload file
  const metadata = { name: file.name, parents: [folderId], mimeType: file.type };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const accessToken = gapi.client.getToken().access_token;
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken },
    body: form,
  });

  const data = await res.json();
  console.log("File uploaded:", data);
  alert(`File uploaded successfully to ${selectedSection} folder!`);
}

async function listFiles(section) {
  const container = document.getElementById("filesContainer");
  container.innerHTML = "Loading files...";

  // Find folder for the section
  const queryFolder = `name='${section}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const folderRes = await gapi.client.drive.files.list({ q: queryFolder, fields: "files(id, name)" });

  if (folderRes.result.files.length === 0) {
    container.innerHTML = `<p>No files uploaded in ${section} yet.</p>`;
    return;
  }

  const folderId = folderRes.result.files[0].id;

  // List files in that folder
  const queryFiles = `'${folderId}' in parents and trashed=false`;
  const filesRes = await gapi.client.drive.files.list({ q: queryFiles, fields: "files(id, name, mimeType, webViewLink)" });

  if (filesRes.result.files.length === 0) {
    container.innerHTML = `<p>No files uploaded in ${section} yet.</p>`;
    return;
  }

  // Display files
  container.innerHTML = "";
  filesRes.result.files.forEach(file => {
    const div = document.createElement("div");
    div.className = "doc-item";
    div.innerHTML = `<a href="${file.webViewLink}" target="_blank">${file.name}</a>`;
    container.appendChild(div);
  });
}


