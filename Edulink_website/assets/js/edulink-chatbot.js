// EduLink AI Chatbot Assistant (v2.0 - Advanced)
(function () {
    // --- Bot Identity & Configuration ---
    const BOT_NAME = 'Edi';
    const BOT_AVATAR = '<img src="assets/img/logo.png" alt="Edi" class="edilink-bot-avatar" style="width:32px;height:32px;border-radius:50%;margin-right:8px;vertical-align:middle;">';
    const PROACTIVE_GREETING_DELAY = 5000; // ms

    // --- Create DOM Elements ---
    function createElements() {
        const chatBtn = document.createElement('button');
        chatBtn.id = 'edulink-chatbot-btn';
        chatBtn.innerHTML = '<i class="bi bi-chat-dots"></i>';
        chatBtn.setAttribute('aria-label', 'Open chat');
        document.body.appendChild(chatBtn);

        const chatWindow = document.createElement('div');
        chatWindow.id = 'edulink-chatbot-window';
        chatWindow.innerHTML = `
            <div class="edulink-chatbot-header">
                <span class="d-flex align-items-center">${BOT_AVATAR}<b>${BOT_NAME}</b> <span style="font-weight:400; opacity:0.8; margin-left:4px;">| EduLink Guide</span></span>
                <div>
                    <button class="edulink-chatbot-new-chat" title="Start New Chat" aria-label="Start New Chat"><i class="bi bi-arrow-clockwise"></i></button>
                    <button class="edulink-chatbot-close" title="Close Chat" aria-label="Close Chat">&times;</button>
                </div>
            </div>
            <div class="edulink-chatbot-messages" role="log" aria-live="polite"></div>
            <div class="edilink-chatbot-typing" style="display:none;"><span class="dot"></span><span class="dot"></span><span class="dot"></span> <span style="font-size:0.95em;">${BOT_NAME} is typing...</span></div>
            <form class="edulink-chatbot-form">
                <input type="text" placeholder="Type your question..." autocomplete="off" aria-label="Your message" />
                <button type="submit" aria-label="Send message"><i class="bi bi-send"></i></button>
            </form>
        `;
        document.body.appendChild(chatWindow);
        return { chatBtn, chatWindow };
    }

    const { chatBtn, chatWindow } = createElements();
    const messages = chatWindow.querySelector('.edulink-chatbot-messages');
    const form = chatWindow.querySelector('.edulink-chatbot-form');
    const input = form.querySelector('input');
    const typing = chatWindow.querySelector('.edilink-chatbot-typing');

    let lastTopic = null; // For multi-turn context

    // --- Core Functions ---
    function showTyping(show = true) {
        typing.style.display = show ? 'flex' : 'none';
    }

    function saveChatHistory() {
        localStorage.setItem('edulinkChatHistory', messages.innerHTML);
    }

    function loadChatHistory() {
        const history = localStorage.getItem('edulinkChatHistory');
        if (history) {
            messages.innerHTML = history;
            messages.scrollTop = messages.scrollHeight;
            return true;
        }
        return false;
    }

    function botReply(text, options = [], suggestions = [], feedback = true, save = true, updateMsgElem = null) {
        showTyping(true);
        setTimeout(() => {
            showTyping(false);
            let msg;
            if (updateMsgElem) {
                msg = updateMsgElem;
                msg.innerHTML = `${BOT_AVATAR}<div>${text}</div>`;
            } else {
                msg = document.createElement('div');
                msg.className = 'edulink-chatbot-msg bot fade-in';
                msg.innerHTML = `${BOT_AVATAR}<div>${text}</div>`;
                messages.appendChild(msg);
            }

            // Remove any existing options/suggestions/feedback if updating
            if (updateMsgElem) {
                let next = msg.nextSibling;
                while (next && (next.classList?.contains('edulink-chatbot-options') || next.classList?.contains('edilink-chatbot-suggestions') || next.classList?.contains('edilink-chatbot-feedback'))) {
                    let toRemove = next;
                    next = next.nextSibling;
                    toRemove.remove();
                }
            }

            // Add options (buttons)
            if (options.length) {
                const opts = document.createElement('div');
                opts.className = 'edulink-chatbot-options';
                options.forEach(opt => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.textContent = opt.label;
                    btn.onclick = () => {
                        userReply(opt.label);
                        setTimeout(() => handleUserInput(opt.value), 400);
                    };
                    opts.appendChild(btn);
                });
                messages.appendChild(opts);
            }

            // Add suggestions (links)
            if (suggestions.length) {
                const sug = document.createElement('div');
                sug.className = 'edilink-chatbot-suggestions';
                sug.innerHTML = '<b>Related:</b> ' + suggestions.map(s => `<a href=\"#\" class=\"edilink-suggestion\">${s.label}</a>`).join(' | ');
                messages.appendChild(sug);
                sug.querySelectorAll('.edilink-suggestion').forEach((a, i) => {
                    a.onclick = (e) => {
                        e.preventDefault();
                        userReply(suggestions[i].label);
                        setTimeout(() => handleUserInput(suggestions[i].value), 400);
                    };
                });
            }

            // Add feedback prompt, but only if there isn't one already visible
            if (feedback) {
                const existingFeedbacks = messages.querySelectorAll('.edilink-chatbot-feedback');
                existingFeedbacks.forEach(fb => fb.remove());
                const fb = document.createElement('div');
                fb.className = 'edilink-chatbot-feedback';
                fb.innerHTML = '<span>Was this helpful?</span> <button class="yes" aria-label="Yes">👍</button> <button class="no" aria-label="No">👎</button>';
                fb.querySelector('.yes').onclick = () => { fb.innerHTML = '<span style="color:#22c55e;">Thank you for your feedback!</span>'; saveChatHistory(); };
                fb.querySelector('.no').onclick = () => { fb.innerHTML = '<span style="color:#e53e3e;">We appreciate your input! How can I improve?</span>'; saveChatHistory(); };
                messages.appendChild(fb);
            }

            messages.scrollTop = messages.scrollHeight;
            if (save) saveChatHistory();
        }, 600 + Math.random() * 400);
        // Return the message element for possible update
        return updateMsgElem || msg;
    }

    function botCardReply(card) {
        showTyping(true);
        setTimeout(() => {
            showTyping(false);
            const cardHtml = `
                <div class="edulink-chatbot-msg bot fade-in">
                    ${BOT_AVATAR}
                    <div class="edilink-rich-card">
                        <img src="${card.imageUrl}" alt="${card.title}" class="edilink-rich-card-img">
                        <div class="edilink-rich-card-body">
                            <h5 class="edilink-rich-card-title">${card.title}</h5>
                            <p class="edilink-rich-card-text">${card.text}</p>
                            <a href="${card.linkUrl}" class="edilink-rich-card-btn">${card.linkText}</a>
                        </div>
                    </div>
                </div>`;
            messages.innerHTML += cardHtml;
            messages.scrollTop = messages.scrollHeight;
            saveChatHistory();
        }, 800);
    }

    function userReply(text) {
        const msg = document.createElement('div');
        msg.className = 'edulink-chatbot-msg user fade-in';
        msg.textContent = text;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
        saveChatHistory();
    }

    // --- Modern Enhancements: Dynamic FAQ, Menu, and Rich Content ---

    // FAQ and Menu Data
    const FAQ_MENU = [
      {
        keywords: ["about", "edulink", "what is edulink", "who are you"],
        answer: `EduLink KE is a platform connecting Kenyan students to verified internships and graduate jobs, empowering youth and bridging the gap between education and employment. <a href='about.html' target='_blank'>Learn more</a>.`,
        label: "About EduLink KE"
      },
      {
        keywords: ["mission", "vision", "values", "core values"],
        answer: `Our mission is to empower Kenyan students with seamless access to internships, jobs, and mentorship. Our vision is a Kenya where every student can easily transition from learning to working. <a href='about.html#mission-vision' target='_blank'>Read our mission & vision</a>.`,
        label: "Mission, Vision & Values"
      },
      {
        keywords: ["register", "sign up", "create account", "how to join"],
        answer: `To register, click the <b>Get Started</b> button at the top right or visit the <a href='register.html' target='_blank'>registration page</a>. Fill in your details and follow the steps to create your profile.`,
        label: "How to Register"
      },
      {
        keywords: ["internship", "opportunity", "job", "listing", "apply"],
        answer: `Browse verified internships and graduate jobs on EduLink KE. Track your applications and get digital certificates. <a href='index.html#featured-opportunities' target='_blank'>See featured opportunities</a>.`,
        label: "Internship Listings"
      },
      {
        keywords: ["certificate", "digital certificate", "logbook"],
        answer: `After completing your internship, your supervisor verifies your digital logbook. You then receive a downloadable, verifiable certificate. <a href='support.html#faqs' target='_blank'>Learn more in FAQs</a>.`,
        label: "Digital Certificates"
      },
      {
        keywords: ["contact", "support", "help", "reach"],
        answer: `You can contact us at <a href='mailto:info@edulink.co.ke'>info@edulink.co.ke</a> or call +254 712 345 678. Visit our <a href='contact.html' target='_blank'>Contact page</a> for more options.`,
        label: "Contact & Support"
      },
      {
        keywords: ["privacy", "policy", "data", "protection"],
        answer: `We are committed to protecting your privacy and data. <a href='policy.html' target='_blank'>Read our Privacy Policy</a>.`,
        label: "Privacy Policy"
      },
      {
        keywords: ["partner", "institution", "employer", "team", "who built", "who made"],
        answer: `EduLink KE is a collaboration between JKUAT, Jhub Africa, and Synapse Technology. Meet our <a href='about.html#meet-the-team' target='_blank'>team</a> and <a href='about.html#partners' target='_blank'>partners</a>.`,
        label: "Partners & Team"
      },
      {
        keywords: ["newsletter", "updates", "subscribe"],
        answer: `Subscribe to our newsletter for updates on internships, features, and events. Enter your email in the newsletter section at the bottom of any page.`,
        label: "Newsletter/Updates"
      },
      {
        keywords: ["menu", "what can you do", "options", "help me"],
        answer: null, // triggers menu
        label: "Show Menu"
      },
    ];

    // Fun/Easter Egg responses
    const FUN_RESPONSES = [
      { keywords: ["joke", "funny"], answer: "Why did the developer go broke? Because they used up all their cache! 😄" },
      { keywords: ["who made you", "who built you", "your creator"], answer: "I was built by the EduLink KE team at JKUAT, with a little help from Synapse Technology!" },
      { keywords: ["hello edi", "hi edi", "hey edi"], answer: "Hi there! 👋 I'm Edi, your friendly EduLink assistant." },
    ];

    // Modern Menu
    function showMenu() {
      const options = FAQ_MENU.filter(f => f.label && f.label !== "Show Menu").map(f => ({ label: f.label, value: f.label.toLowerCase() }));
      botReply("How can I help you? Here are some things I can assist with:", options, [], false);
    }

    // Card for team/partners
    function showTeamCard() {
      botCardReply({
        imageUrl: "assets/img/edulink_team.jpg",
        title: "Meet the EduLink KE Team",
        text: "A passionate group of students and mentors from JKUAT, supported by Synapse Technology and Jhub Africa.",
        linkUrl: "about.html#meet-the-team",
        linkText: "View Team"
      });
    }
    function showPartnersCard() {
      botCardReply({
        imageUrl: "assets/img/partner1.png",
        title: "Our Partners",
        text: "JKUAT, Jhub Africa, and Synapse Technology help us empower Kenyan youth.",
        linkUrl: "about.html#partners",
        linkText: "See Partners"
      });
    }
    function showOpportunityCard() {
      botCardReply({
        imageUrl: "assets/img/course-1.jpg",
        title: "Featured Internship: Software Development",
        text: "Join Synapse Technologies as a Software Development Intern in Nairobi. KES 40,000/mo. See more opportunities on our homepage!",
        linkUrl: "index.html#featured-opportunities",
        linkText: "View Opportunities"
      });
    }

    // --- Enhanced Input Handler (Override) ---
    function handleUserInput(raw, skipBackend, updateMsgElem) {
      const text = raw.trim().toLowerCase();

      // Fun responses
      for (const fun of FUN_RESPONSES) {
        if (fun.keywords.some(kw => text.includes(kw))) {
          botReply(fun.answer, [{ label: 'Show Menu', value: 'menu' }], [], false, true, updateMsgElem);
          return;
        }
      }

      // FAQ/Menu matching
      for (const faq of FAQ_MENU) {
        if (faq.keywords.some(kw => text.includes(kw))) {
          if (faq.label === "Partners & Team") {
            showTeamCard();
            showPartnersCard();
            botReply(faq.answer, [{ label: 'Show Menu', value: 'menu' }], [], false, true, updateMsgElem);
            return;
          }
          if (faq.label === "Internship Listings") {
            showOpportunityCard();
            botReply(faq.answer, [{ label: 'Show Menu', value: 'menu' }], [], false, true, updateMsgElem);
            return;
          }
          if (faq.label === "Show Menu") {
            showMenu();
            return;
          }
          botReply(faq.answer, [{ label: 'Show Menu', value: 'menu' }], [], false, true, updateMsgElem);
          return;
        }
      }

      // Fallback: try to match partials
      if (["team", "partner"].some(kw => text.includes(kw))) {
        showTeamCard();
        showPartnersCard();
        botReply("Want to know more about our team or partners? <a href='about.html#meet-the-team' target='_blank'>Meet the team</a> or <a href='about.html#partners' target='_blank'>see our partners</a>.", [{ label: 'Show Menu', value: 'menu' }]);
        return;
      }
      if (["opportunity", "internship", "job"].some(kw => text.includes(kw))) {
        showOpportunityCard();
        botReply("See more opportunities on our homepage! <a href='index.html#featured-opportunities' target='_blank'>Featured Opportunities</a>.", [{ label: 'Show Menu', value: 'menu' }]);
        return;
      }

      // Default fallback
      botReply("I'm not sure how to help with that yet. Try asking about EduLink, internships, registration, or type 'menu' to see options.", [{ label: 'Show Menu', value: 'menu' }], [], false, true, updateMsgElem);
    }

    // --- Proactive Greeting with Menu ---
    function welcome(isProactive = false) {
      const hour = new Date().getHours();
      let greeting = "Hi! 👋 I'm Edi, your EduLink assistant.";
      if (hour < 12) greeting = "Good morning! ☀️ I'm Edi, your EduLink assistant.";
      else if (hour < 18) greeting = "Good afternoon! 🌞 I'm Edi, your EduLink assistant.";
      else greeting = "Good evening! 🌙 I'm Edi, your EduLink assistant.";
      botReply(greeting + " How can I help you today?", [
        { label: "Show Menu", value: "menu" },
        { label: "About EduLink KE", value: "about edulink" },
        { label: "How to Register", value: "register" },
        { label: "Internship Listings", value: "internship" },
        { label: "Contact & Support", value: "contact" }
      ], [], false);
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        chatBtn.onclick = () => {
            chatWindow.classList.add('open');
            chatBtn.style.display = 'none';
            if (!loadChatHistory()) {
                welcome();
            }
            setTimeout(() => input.focus(), 200);
        };

        chatWindow.querySelector('.edulink-chatbot-close').onclick = () => {
            chatWindow.classList.remove('open');
            chatBtn.style.display = 'block';
        };
        chatWindow.querySelector('.edulink-chatbot-new-chat').onclick = () => {
            messages.innerHTML = '';
            localStorage.removeItem('edulinkChatHistory');
            welcome();
        };
        form.onsubmit = (e) => {
            e.preventDefault();
            const val = input.value.trim();
            if (!val) return;
            userReply(val);
            input.value = '';
            setTimeout(() => handleUserInput(val), 400);
        };
        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && chatWindow.classList.contains('open')) {
                chatWindow.classList.remove('open');
                chatBtn.style.display = 'block';
            }
        });
    }

    // --- Proactive Greeting Trigger ---
    function initProactiveGreeting() {
        if (!sessionStorage.getItem('edulinkProactiveGreetingShown')) {
            setTimeout(() => {
                if (!chatWindow.classList.contains('open')) {
                    chatWindow.classList.add('open');
                    chatBtn.style.display = 'none';
                    welcome(true);
                    sessionStorage.setItem('edulinkProactiveGreetingShown', 'true');
                }
            }, PROACTIVE_GREETING_DELAY);
        }
    }

    // --- Initialise ---
    function init() {
        const style = document.createElement('style');
        style.innerHTML = `
      #edulink-chatbot-btn {
        position: fixed;
        bottom: 32px;
        right: 32px;
        z-index: 9999;
        background: #009999;
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 56px;
        height: 56px;
        font-size: 2rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      #edulink-chatbot-btn:hover {
        background: #22c55e;
      }
      #edulink-chatbot-window {
        position: fixed;
        bottom: 100px;
        right: 32px;
        width: 370px;
        max-width: 90vw;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        z-index: 10000;
        display: none;
        flex-direction: column;
        overflow: hidden;
        border: 2px solid #009999;
      }
      #edulink-chatbot-window.open {
        display: flex;
        animation: fadeInUp 0.3s;
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(40px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .edulink-chatbot-header {
        background: #009999;
        color: #fff;
        padding: 14px 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 1.1rem;
      }
      .edulink-chatbot-header .edulink-chatbot-close, .edulink-chatbot-header .edulink-chatbot-new-chat {
        background: none;
        border: none;
        color: rgba(255,255,255,0.8);
        font-size: 1.5rem;
        cursor: pointer;
        transition: color 0.2s;
      }
      .edulink-chatbot-header .edulink-chatbot-new-chat {
        font-size: 1.1rem;
        margin-right: 8px;
      }
      .edulink-chatbot-header button:hover {
          color: #fff;
      }
      .edulink-chatbot-messages {
        flex: 1 1 auto;
        padding: 18px;
        background: #f8fafc;
        overflow-y: auto;
        max-height: 400px;
        min-height: 150px;
        font-size: 1rem;
      }
      .edulink-chatbot-msg {
        margin-bottom: 12px;
        max-width: 90%;
        word-break: break-word;
        line-height: 1.5;
        opacity: 0;
        animation: fadeInMsg 0.5s forwards;
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      @keyframes fadeInMsg {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .edulink-chatbot-msg.bot > div {
        background: #e0f7f7;
        color: #009999;
        padding: 10px 14px;
        border-radius: 0 12px 12px 12px;
      }
      .edulink-chatbot-msg.user {
        background: #22c55e;
        color: #fff;
        margin-left: auto;
        padding: 10px 14px;
        border-radius: 12px 0px 12px 12px;
        justify-content: flex-end;
      }
      .edulink-chatbot-options {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .edulink-chatbot-options button {
        background: #009999;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 6px 14px;
        font-size: 0.97rem;
        cursor: pointer;
        transition: background 0.2s;
      }
      .edulink-chatbot-options button:hover {
        background: #22c55e;
      }
      .edilink-chatbot-suggestions {
        margin: 8px 0;
        font-size: 0.97rem;
        color: #009999;
      }
      .edilink-chatbot-suggestions a {
        color: #22c55e;
        text-decoration: underline;
        cursor: pointer;
      }
      .edilink-chatbot-feedback {
        margin: 8px 0;
        font-size: 0.97rem;
        color: #4f5a65;
      }
      .edilink-chatbot-feedback button {
        background: none;
        border: none;
        font-size: 1.1em;
        cursor: pointer;
        margin-left: 6px;
        transition: color 0.2s;
      }
      .edilink-chatbot-feedback button:hover {
        transform: scale(1.15);
      }

      /* Rich Card Styling - adapted for old theme */
      .edilink-rich-card { background: #fff; border-radius: 12px; overflow:hidden; border: 1px solid #e0f7f7; margin-top: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
      .edilink-rich-card-img { width: 100%; height: 120px; object-fit: cover; }
      .edilink-rich-card-body { padding: 12px; }
      .edilink-rich-card-title { font-size: 1rem; font-weight: 700; margin:0 0 4px 0; color: #37423b; }
      .edilink-rich-card-text { font-size: 0.95rem; margin:0 0 10px 0; color: #475569; }
      .edilink-rich-card-btn { background: #009999; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; text-decoration: none; display: inline-block; transition: background 0.2s; }
      .edilink-rich-card-btn:hover { background: #22c55e; }

      .edilink-chatbot-typing {
        display: flex;
        align-items: center;
        padding: 0 18px 8px 18px;
        color: #009999;
        font-size: 1.05em;
        gap: 6px;
      }
      .edilink-chatbot-typing .dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 2px;
        background: #22c55e;
        border-radius: 50%;
        animation: blink 1.2s infinite both;
      }
      .edilink-chatbot-typing .dot:nth-child(2) { animation-delay: 0.2s; }
      .edilink-chatbot-typing .dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes blink {
        0%, 80%, 100% { opacity: 0.2; }
        40% { opacity: 1; }
      }
      .edulink-chatbot-form {
        display: flex;
        border-top: 1px solid #e2e8f0;
        background: #fff;
        padding: 10px 12px;
      }
      .edulink-chatbot-form input {
        flex: 1 1 auto;
        border: none;
        outline: none;
        font-size: 1rem;
        padding: 8px 10px;
        border-radius: 8px;
        background: #f0fdf4;
        margin-right: 8px;
      }
      .edulink-chatbot-form button {
        background: #009999;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0 14px;
        font-size: 1.2rem;
        cursor: pointer;
        transition: background 0.2s;
      }
      .edulink-chatbot-form button:hover {
        background: #22c55e;
      }
      @media (max-width: 600px) {
        #edulink-chatbot-window {
          right: 8px;
          width: auto;
          left: 8px;
        }
        #edulink-chatbot-btn {
          right: 15px;
          bottom: 15px;
        }
      }
        `;
        document.head.appendChild(style);
        setupEventListeners();
        if (!loadChatHistory()) {
            initProactiveGreeting();
        }
    }

    // Run when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
