package com.example.downloadmanager.plugin;

import android.content.Context;
import android.os.Environment;
import com.yausername.aria2c.Aria2c;
import com.yausername.ffmpeg.FFmpeg;
import com.yausername.youtubedl_android.YoutubeDL;
import java.io.File;

/** One place that unpacks the native engines (yt-dlp, ffmpeg, aria2c) exactly once. */
final class Engines {
    private static boolean ready = false;

    private Engines() {}

    static synchronized void ensure(Context context) throws Exception {
        if (ready) return;
        Context app = context.getApplicationContext();
        YoutubeDL.getInstance().init(app);
        FFmpeg.getInstance().init(app);
        Aria2c.getInstance().init(app);
        ready = true;
    }

    static File packagesDir(Context context) {
        return new File(new File(context.getNoBackupFilesDir(), "youtubedl-android"), "packages");
    }

    /** Requested folder if writable, otherwise the app's own downloads folder. */
    static File resolveOutputDir(Context context, String requested) {
        if (requested != null && !requested.isEmpty()) {
            File d = new File(requested);
            if ((d.isDirectory() || d.mkdirs()) && d.canWrite()) return d;
        }
        File d = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (d == null) d = new File(context.getFilesDir(), "downloads");
        d.mkdirs();
        return d;
    }
}
