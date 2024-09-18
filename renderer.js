const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', async () => {
  const paths = await ipcRenderer.invoke('get-default-paths');
  const folderOptions = document.getElementById('folder-options');

  for (const [key, value] of Object.entries(paths)) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = key;
    checkbox.value = value;

    const label = document.createElement('label');
    label.htmlFor = key;
    label.textContent = key.charAt(0).toUpperCase() + key.slice(1);

    folderOptions.appendChild(checkbox);
    folderOptions.appendChild(label);
    folderOptions.appendChild(document.createElement('br'));
  }

  document.getElementById('start-button').addEventListener('click', () => {
    const selectedPaths = Array.from(document.querySelectorAll('#folder-options input:checked'))
      .map(checkbox => checkbox.value);

    if (selectedPaths.length === 0) {
      alert('Please select at least one directory to watch.');
      return;
    }

    console.log(`Selected paths: ${selectedPaths.join(', ')}`);
    // Here you can call your existing logic to start watching the selected paths
  });
});
