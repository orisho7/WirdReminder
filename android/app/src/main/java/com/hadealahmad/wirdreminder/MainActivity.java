package com.hadealahmad.wirdreminder;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);

        // Disable WebView's automatic dark mode - we handle it ourselves via CSS
        try {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(
                    this.getBridge().getWebView().getSettings(), false
                );
            } else if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                WebSettingsCompat.setForceDark(
                    this.getBridge().getWebView().getSettings(),
                    WebSettingsCompat.FORCE_DARK_OFF
                );
            }
        } catch (Exception e) {
            // Ignore - WebView may not support these features
        }
    }
}
