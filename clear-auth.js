// Clear Auth Data Script
// Copy and paste this into your browser console (F12) when on http://localhost:5173

(function() {
    console.log('🧹 Clearing authentication data...');
    
    // Clear localStorage
    localStorage.removeItem('auth:user');
    console.log('✅ Cleared localStorage');
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ Cleared sessionStorage');
    
    // Clear all cookies for localhost
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        // Clear cookies for current domain
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=localhost;";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.localhost;";
    }
    console.log('✅ Cleared cookies');
    
    // Specifically clear auth cookies
    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;";
    document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;";
    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    console.log('✅ Cleared authentication cookies');
    console.log('');
    console.log('🎉 All authentication data cleared!');
    console.log('💡 Please refresh the page (F5) to see the changes.');
    console.log('');
    console.log('⚠️  Note: If you want to test signup with the same email,');
    console.log('   you also need to delete the user from the database.');
    console.log('   See CLEAR_AUTH_DATA.md for database deletion instructions.');
})();

