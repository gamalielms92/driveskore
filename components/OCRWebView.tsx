import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface OCRWebViewProps {
  imageUri: string | null;
  onTextExtracted?: (text: string, confidence: number) => void;
  onError?: (error: string) => void;
}

interface OCRMessage {
  type: 'status' | 'progress' | 'success' | 'error';
  message?: string;
  text?: string;
  confidence?: number;
  progress?: number;
}

const OCRWebView: React.FC<OCRWebViewProps> = ({
  imageUri,
  onTextExtracted,
  onError
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <!-- Tesseract.js v5 -->
      <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/dist/tesseract.min.js"></script>
      <!-- OpenCV.js -->
      <script async src="https://docs.opencv.org/4.x/opencv.js" onload="cvReady()"></script>
      <style>
        body { font-family: -apple-system, Roboto, sans-serif; margin: 0; }
        #log { font-size: 10px; padding: 6px; line-height: 1.2; max-height: 140px; overflow:auto; }
      </style>
    </head>
    <body>
      <div id="log">Cargando Tesseract v5 + OpenCV…</div>
      <script>
        // ---------- Constantes CDN ----------
        const CDN = {
          workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
          corePath:   "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js",
          langPath:   "https://tessdata.projectnaptha.com/4.0.0"
        };

        let worker = null;
        let cvReadyFlag = false;

        const logEl = document.getElementById('log');
        const log = (m) => {
          try { logEl.innerHTML += m + "<br/>"; logEl.scrollTop = logEl.scrollHeight; } catch(_) {}
          try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type:'status', message: m })); } catch(_) {}
        };
        const post = (type, payload) => { try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...payload })); } catch(_) {} };

        // ---------- OpenCV bootstrap ----------
        function cvReady(){
          if (window.cv) {
            cv['onRuntimeInitialized'] = () => { cvReadyFlag = true; log('OpenCV listo'); };
          }
        }
        function waitFor(cond, timeout=8000, step=40){
          return new Promise((res,rej)=>{
            const t0 = Date.now();
            const iv = setInterval(()=>{
              if (cond()) { clearInterval(iv); res(true); }
              else if (Date.now()-t0 > timeout) { clearInterval(iv); rej(new Error('Timeout esperando dependencia')); }
            }, step);
          });
        }
        function loadImage(uri){
          return new Promise((res,rej)=>{
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = ()=>res(img);
            img.onerror = rej;
            img.src = uri;
          });
        }

        // ---------- Worker con reintentos ----------
        function ocrLogger(m){
          if (m?.status) {
            const line = m.status + (m.progress != null ? (": " + Math.round(m.progress*100) + "%") : "");
            post('status', { message: line });
            if (m.status === 'recognizing text' && m.progress != null) {
              post('progress', { progress: Math.round(m.progress*100) });
            }
          }
        }

        async function createWorkerStrategy(strategy=1){
          if (strategy === 1) {
            // Rutas explícitas + sin blobs (ideal en WebView file://)
            return Tesseract.createWorker({
              workerPath: CDN.workerPath,
              corePath: CDN.corePath,
              langPath: CDN.langPath,
              workerBlobURL: false,
              logger: ocrLogger
            });
          }
          if (strategy === 2) {
            // Autodetección sin rutas
            return Tesseract.createWorker({
              workerBlobURL: false,
              logger: ocrLogger
            });
          }
          // Estrategia 3: permitir blobs (por si el WebView lo tolera mejor)
          return Tesseract.createWorker({
            workerPath: CDN.workerPath,
            corePath: CDN.corePath,
            langPath: CDN.langPath,
            workerBlobURL: true,
            logger: ocrLogger
          });
        }

        async function ensureWorker(lang='eng'){
          if (worker) return worker;

          const strategies = [1,2,3];
          let lastErr;

          for (const s of strategies) {
            log(\`Inicializando worker (estrategia \${s})…\`);
            try {
              const w = await createWorkerStrategy(s);
              await w.load();
              await w.loadLanguage(lang);
              await w.initialize(lang);
              await w.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                tessedit_pageseg_mode: '7',   // 7=SINGLE_LINE. Si el recorte es muy ajustado, prueba '8'
                load_system_dawg: '0',
                load_freq_dawg: '0',
                user_defined_dpi: '300'
              });
              worker = w;
              log(\`Worker listo con estrategia \${s}\`);
              return worker;
            } catch (e) {
              lastErr = e;
              log(\`⚠️ Fallo cargando worker (estrategia \${s}): \${e?.message || e}\`);
            }
          }

          throw new Error(\`No se pudo cargar el worker. Último error: \${lastErr?.message || String(lastErr)}\`);
        }

        // ---------- Preprocesado OpenCV (detección ROI + warping + filtros) ----------
        async function preprocessPlate(uri){
          await waitFor(()=>cvReadyFlag, 8000).catch(()=>{ throw new Error('OpenCV no disponible'); });

          const img = await loadImage(uri);
          const src = cv.imread(img);

          // a gris + blur + Canny
          let gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
          let blur = new cv.Mat();
          cv.GaussianBlur(gray, blur, new cv.Size(5,5), 0);
          let edges = new cv.Mat();
          cv.Canny(blur, edges, 110, 220); // ajustado para reducir ruido

          // contornos
          let contours = new cv.MatVector();
          let hierarchy = new cv.Mat();
          cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

          let best = null, bestArea = 0;

          for (let i=0;i<contours.size();i++){
            const c = contours.get(i);
            const peri = cv.arcLength(c, true);
            let approx = new cv.Mat();
            cv.approxPolyDP(c, approx, 0.02*peri, true);
            if (approx.rows === 4){
              const rect = quadOrder(approx);
              const w = dist(rect[0], rect[1]);
              const h = dist(rect[1], rect[2]);
              const ar = w/h;
              // Matrícula ES ~4.5:1 (aceptamos 3.0–6.0)
              if (ar > 3.0 && ar < 6.0){
                const area = w*h;
                if (area > bestArea) { bestArea = area; best = rect; }
              }
            }
            approx.delete();
            c.delete();
          }

          // warping si hay ROI
          let plate = new cv.Mat();
          if (best){
            const dstW = 600, dstH = Math.round(dstW/4.5);
            const srcTri = cv.matFromArray(4,1,cv.CV_32FC2, flatten(best));
            const dstTri = cv.matFromArray(4,1,cv.CV_32FC2, [0,0, dstW,0, dstW,dstH, 0,dstH]);
            const M = cv.getPerspectiveTransform(srcTri, dstTri);
            cv.warpPerspective(src, plate, M, new cv.Size(dstW, dstH));
            M.delete(); srcTri.delete(); dstTri.delete();
          } else {
            plate = src.clone(); // fallback a imagen completa
          }

          // Escala x3
          let big = new cv.Mat();
          cv.resize(plate, big, new cv.Size(plate.cols*3, plate.rows*3), 0, 0, cv.INTER_CUBIC);

          // Gris + bilateral + Otsu + ligera dilatación
          let pgray = new cv.Mat();
          cv.cvtColor(big, pgray, cv.COLOR_RGBA2GRAY);
          let den = new cv.Mat();
          cv.bilateralFilter(pgray, den, 7, 75, 75);
          let bin = new cv.Mat();
          cv.threshold(den, bin, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
          const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2,2));
          let dil = new cv.Mat();
          cv.morphologyEx(bin, dil, cv.MORPH_DILATE, kernel);

          const out = matToDataURL(dil);

          [gray, blur, edges, contours, hierarchy, plate, big, pgray, den, bin, kernel, dil, src].forEach(m=>m.delete?.());
          return out;

          // helpers
          function quadOrder(approx){
            const pts = [];
            for (let i=0;i<approx.rows;i++){
              const p = approx.intPtr(i,0);
              pts.push([p[0], p[1]]);
            }
            pts.sort((a,b)=>a[1]-b[1]);
            const [t1,t2,b1,b2] = pts;
            const [tl,tr] = (t1[0]<t2[0]) ? [t1,t2] : [t2,t1];
            const [bl,br] = (b1[0]<b2[0]) ? [b1,b2] : [b2,b1];
            return [tl,tr,br,bl];
          }
          function dist(a,b){ const dx=a[0]-b[0], dy=a[1]-b[1]; return Math.hypot(dx,dy); }
          function flatten(arr){ return arr.flat(); }
          function matToDataURL(mat){
            const canvas = document.createElement('canvas');
            canvas.width = mat.cols; canvas.height = mat.rows;
            cv.imshow(canvas, mat);
            return canvas.toDataURL('image/png');
          }
        }

        // ---------- Fallback sin OpenCV (canvas) ----------
        async function preprocessCanvas(uri){
          return new Promise((resolve, reject)=>{
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = ()=>{
              const scale = 2.5;
              const w = Math.max(1, Math.floor(img.width * scale));
              const h = Math.max(1, Math.floor(img.height * scale));
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.filter = 'contrast(180%) brightness(115%)';
              ctx.drawImage(img, 0, 0, w, h);
              const id = ctx.getImageData(0,0,w,h);
              const d = id.data;
              for (let i=0;i<d.length;i+=4){
                const v = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]);
                const t = v > 160 ? 255 : 0;
                d[i]=d[i+1]=d[i+2]=t;
              }
              ctx.putImageData(id,0,0);
              resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = uri;
          });
        }

        // ---------- Normalización de matrícula ES ----------
        function normalizePlate(s){
          s = (s || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
          s = s.replace(/O/g,'0').replace(/I/g,'1').replace(/B/g,'8').replace(/S/g,'5');
          const m = s.match(/(\\d{4})([A-Z]{3})/);
          if (!m) return { raw: s, plate: null };
          const letters = m[2].replace(/[AEIOUÑ]/g, '');
          if (letters.length !== 3) return { raw: s, plate: null };
          return { raw: s, plate: \`\${m[1]} \${letters}\` };
        }

        // ---------- Pipeline principal ----------
        async function processImage(imageUri){
          try{
            log('=== INICIO PROCESAMIENTO ===');

            // 1) Worker con reintentos
            const w = await ensureWorker('eng');

            // 2) Preproceso (OpenCV si está, si no canvas)
            let processed;
            try {
              processed = await preprocessPlate(imageUri);
              log('Preprocesado OpenCV OK');
            } catch (e) {
              log('OpenCV no disponible o sin ROI: ' + (e?.message || e));
              processed = await preprocessCanvas(imageUri);
              log('Preprocesado Canvas OK');
            }

            // 3) OCR
            const res = await w.recognize(processed);
            const text = (res?.data?.text || '').trim();
            const conf = res?.data?.confidence ?? res?.data?.conf ?? 0;
            const norm = normalizePlate(text);

            post('success', { text: norm.plate || text, confidence: conf });
            log(\`Texto: "\${text}" | Normalizado: "\${norm.plate || '—'}" | Confianza: \${conf}\`);
            log('=== FIN PROCESAMIENTO ===');
          } catch (e) {
            const msg = e?.message || String(e);
            post('error', { message: msg });
            log('❌ ERROR OCR: ' + msg);
          }
        }

        // ---------- Mensajería RN <-> WebView ----------
        function handleMessage(event){
          try{
            const data = JSON.parse(event.data);
            if (data?.action === 'processImage' && data?.imageUri) {
              processImage(data.imageUri);
            }
          }catch(e){
            log('Error parseando mensaje: ' + e.message);
          }
        }

        document.addEventListener('message', handleMessage);
        window.addEventListener('message', handleMessage);
        log('✅ Sistema listo (v5 + OpenCV, con reintentos de worker)');
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data: OCRMessage = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'status':
          console.log('📝 Estado:', data.message);
          break;
        case 'progress':
          console.log('⏳ Progreso:', data.progress + '%');
          break;
        case 'success':
          setIsProcessing(false);
          console.log('✅ Éxito! Texto:', data.text);
          if (onTextExtracted && data.text && data.confidence !== undefined) {
            onTextExtracted(data.text, data.confidence);
          }
          break;
        case 'error':
          setIsProcessing(false);
          console.error('❌ Error:', data.message);
          onError?.(data.message || 'Error desconocido');
          break;
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
    }
  };

  useEffect(() => {
    if (imageUri && webViewRef.current) {
      console.log('🚀 Enviando imagen al WebView:', imageUri.substring(0, 50) + '...');
      setIsProcessing(true);
      webViewRef.current.postMessage(JSON.stringify({
        action: 'processImage',
        imageUri,
      }));
    }
  }, [imageUri]);

  return (
    <View style={styles.container}>
      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Procesando imagen...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // 🔑 Permisos para Android WebView + file:// + CDN
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        onLoadStart={() => console.log('🔄 WebView: Iniciando carga...')}
        onLoadEnd={() => console.log('✅ WebView: Carga completada')}
        onError={(e) => {
          const { nativeEvent } = e;
          console.error('❌ WebView error:', nativeEvent);
          onError?.('Error al cargar WebView: ' + nativeEvent.description);
        }}
        onHttpError={(e) => {
          console.error('❌ HTTP error:', e.nativeEvent);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 0 },
  webview: { width: 0, height: 0, opacity: 0 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
});

export default OCRWebView;
