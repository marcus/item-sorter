const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', async () => {
  const paths = await ipcRenderer.invoke('get-default-paths');
  const selectElement = document.getElementById('folder-select');

  for (const [key, value] of Object.entries(paths)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    selectElement.appendChild(option);
  }

  document.getElementById('start-button').addEventListener('click', () => {
    const selectedPath = selectElement.value;
    console.log(`Selected path: ${selectedPath}`);
    // Here you can call your existing logic to process files in the selected path
  });
});
