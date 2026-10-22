package com.example.downloadmanager.plugin;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** App level helpers: background keep-alive and shared storage access. */
@CapacitorPlugin(name = "Downly")
public class DownlyPlugin extends Plugin {

    /** The app tells us how many downloads are queued or running so the service outlives the UI. */
    @PluginMethod
    public void setPending(PluginCall call) {
        DownloadService.setPending(getContext(), call.getInt("count", 0));
        call.resolve();
    }

    @PluginMethod
    public void hasAllFilesAccess(PluginCall call) {
        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R;
        JSObject out = new JSObject();
        out.put("supported", supported);
        out.put("granted", !supported || Environment.isExternalStorageManager());
        call.resolve(out);
    }

    @PluginMethod
    public void requestAllFilesAccess(PluginCall call) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the access settings", "NO_SETTINGS");
        }
    }
}
