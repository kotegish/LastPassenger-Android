package com.solodefstudio.lastpassenger;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class MainActivity extends Activity {
    private WebView gameView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );

        gameView = new WebView(this);
        gameView.setBackgroundColor(0xFF080B12);
        WebSettings settings = gameView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        gameView.setWebChromeClient(new WebChromeClient());
        setContentView(gameView);
        gameView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (gameView != null) {
            gameView.evaluateJavascript("if(window.gamePause){window.gamePause();}", null);
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (gameView != null) {
            gameView.destroy();
            gameView = null;
        }
        super.onDestroy();
    }
}
