package com.example.downloadmanager;

import android.os.Bundle;
import com.example.downloadmanager.plugin.Aria2Plugin;
import com.example.downloadmanager.plugin.DownlyPlugin;
import com.example.downloadmanager.plugin.YtDlpPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins are not auto-discovered. Without this the JS side gets
        // "YtDlp plugin is not implemented on android".
        registerPlugin(YtDlpPlugin.class);
        registerPlugin(Aria2Plugin.class);
        registerPlugin(DownlyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
