import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { BrowserExtensionCleaner } from "@/components/browser-extension-cleaner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Конструктор презентаций с ИИ",
  description: "Создавайте потрясающие презентации с помощью ИИ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <BrowserExtensionCleaner />
        {children}
        <Script
          id="remove-browser-extensions-early"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Раннее удаление элементов расширений до начала гидратации React
                function removeExtensionElements() {
                  try {
                    const selectors = [
                      '[id^="ext-"]',
                      '[class^="ext-"]',
                      '[id*="megabonus"]',
                      '[class*="megabonus"]',
                      '[id="ext-megabonus-main-content"]',
                      '[class="ext-megabonus-top-line"]'
                    ];
                    
                    selectors.forEach(function(selector) {
                      try {
                        var elements = document.querySelectorAll(selector);
                        for (var i = 0; i < elements.length; i++) {
                          if (elements[i] && elements[i].parentNode) {
                            elements[i].remove();
                          }
                        }
                      } catch (e) {}
                    });
                  } catch (e) {}
                }
                
                // Удаляем сразу, если DOM уже загружен
                if (document.body) {
                  removeExtensionElements();
                }
                
                // Удаляем при загрузке DOM
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', removeExtensionElements);
                } else {
                  removeExtensionElements();
                }
                
                // Используем MutationObserver для раннего отслеживания
                if (document.body) {
                  var observer = new MutationObserver(function() {
                    removeExtensionElements();
                  });
                  observer.observe(document.body, {
                    childList: true,
                    subtree: true
                  });
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
