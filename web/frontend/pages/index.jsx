import { Page, Layout, LegacyCard, TextField, Button } from "@shopify/polaris";
import { useState } from "react";

export default function IndexPage() {
  const [announcement, setAnnouncement] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!announcement.trim()) {
      alert("Please enter some announcement text first!");
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch a fresh idToken from Shopify App Bridge
      const sessionToken = await window.shopify.idToken();

      // 2. Extract context parameters from the current URL query string
      const urlParams = new URLSearchParams(window.location.search);
      const shop = urlParams.get("shop");
      const host = urlParams.get("host");

      // 3. Build the absolute backend target path
      const backendUrl = `${window.location.origin}/api/announcement?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`;

      // 4. Send the request with the headers structured exactly as Shopify expects
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": `Bearer ${sessionToken}`,
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ 
          text: announcement,
          shop: shop
        }),
      });
      
      const responseText = await response.text();
      let data = {};
      
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error("Raw non-JSON response from server:", responseText);
        alert(`Server Status (${response.status}): ${responseText.substring(0, 120)}`);
        return;
      }

      if (response.ok) {
        alert("Success: Announcement saved successfully!");
      } else {
        alert(`Request Failed (Status ${response.status}): ${data.error || responseText}`);
      }
    } catch (err) {
      console.error("Frontend Exception Caught:", err);
      alert(`Network/App Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Announcement Customizer">
      <Layout>
        <Layout.Section>
          <LegacyCard title="Custom Banner Text" sectioned>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <TextField
                label="Announcement Text"
                value={announcement}
                onChange={(value) => setAnnouncement(value)}
                autoComplete="off"
                placeholder="Ex: 50% off on shoes"
              />
              <div>
                <Button loading={loading} variant="primary" onClick={handleSave}>
                  Save & Sync
                </Button>
              </div>
            </div>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}