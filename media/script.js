document.addEventListener('DOMContentLoaded', function () {
    console.log("Commento Extension Home Page Loaded");

    // Function to apply the system theme (light or dark)
    function applyTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }

    // Apply theme when the page is loaded
    applyTheme();

    // Listen for theme changes in the system
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
});
