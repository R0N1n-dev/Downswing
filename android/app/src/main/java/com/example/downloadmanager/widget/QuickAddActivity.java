package com.example.downloadmanager.widget;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import com.example.downloadmanager.MainActivity;
import com.example.downloadmanager.R;
import com.example.downloadmanager.plugin.WidgetRunner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Quick add from the home screen, without entering the app.
 *
 * RemoteViews widgets cannot take text input and a background receiver cannot read the
 * clipboard on Android 10+ — so the widget opens this tiny translucent activity instead.
 * While it is focused (the user just tapped the widget) reading the clipboard is allowed;
 * on Start it hands the link to the native runner and finishes immediately. The download
 * itself survives because WidgetRunner promotes the dataSync foreground service before we
 * close. If there is no usable link we offer a one-tap fallback that opens the full app.
 */
public class QuickAddActivity extends Activity {

    private static final Pattern LINK = Pattern.compile("(https?://[^\\s]+|magnet:\\?[^\\s]+)");

    private TextView urlView;
    private Button startBtn;
    private View fallbackRow;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setFinishOnTouchOutside(true); // tap the dimmed backdrop to dismiss
        setContentView(R.layout.quick_add);

        urlView = findViewById(R.id.qa_url);
        startBtn = findViewById(R.id.qa_start);
        fallbackRow = findViewById(R.id.qa_fallback);

        Button cancelBtn = findViewById(R.id.qa_cancel);
        Button openAppBtn = findViewById(R.id.qa_open_app);

        cancelBtn.setOnClickListener(v -> finish());
        openAppBtn.setOnClickListener(v -> {
            startActivity(new Intent(this, MainActivity.class));
            finish();
        });
        startBtn.setOnClickListener(v -> startDownload());

        // Only read while we actually hold focus — the user just tapped our widget.
        urlView.post(() -> {
            if (urlView.getWindowToken() != null) readClipboard();
        });
    }

    private void readClipboard() {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm == null || !cm.hasPrimaryClip()) return;
        ClipData clip = cm.getPrimaryClip();
        if (clip == null || clip.getItemCount() == 0) return;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < clip.getItemCount(); i++) {
            CharSequence text = clip.getItemAt(i).coerceToText(this);
            if (text != null) sb.append(text).append(' ');
        }
        Matcher m = LINK.matcher(sb.toString());
        if (m.find()) {
            String link = m.group(1).replaceFirst("[),.]+$", ""); // trailing punctuation from chat apps
            urlView.setText(link);
            startBtn.setEnabled(true);
        } else {
            urlView.setHint(R.string.qa_no_link_hint);
            showFallback();
        }
    }

    private void showFallback() {
        fallbackRow.setVisibility(View.VISIBLE);
    }

    private void startDownload() {
        String url = urlView.getText() == null ? "" : urlView.getText().toString().trim();
        Matcher m = LINK.matcher(url);
        if (!m.find()) {
            Toast.makeText(this, R.string.qa_need_link, Toast.LENGTH_SHORT).show();
            showFallback();
            return;
        }
        startBtn.setEnabled(false);
        try {
            WidgetRunner.start(this, m.group(1));
            Toast.makeText(this, R.string.qa_started, Toast.LENGTH_SHORT).show();
            finish();
        } catch (Exception e) {
            startBtn.setEnabled(true);
            Toast.makeText(this, R.string.qa_failed, Toast.LENGTH_SHORT).show();
            showFallback();
        }
    }
}
