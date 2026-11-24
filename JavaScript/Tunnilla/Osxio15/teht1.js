function loadSettings()
{
    try{

        const raw = localStorage.getItem("settings");
        if(!raw)
        {
            return defaultSettings();
        } 
        return raw;

    }
    catch(error)
    {
        console.log("Tuli tällainen virhe: ", error);
        return defaultSettings();
    }

}