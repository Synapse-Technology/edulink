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

    // --- Enhanced Input Handler ---
    function handleUserInput(raw, skipBackend, updateMsgElem) {
        const text = raw.trim().toLowerCase();
        
        // Greetings and common pleasantries
        const greetings = ["hi", "hello", "hey", "yo", "good morning", "good afternoon", "good evening", "greetings", "what's up", "sup", "howdy"]; 
        if (greetings.includes(text)) {
            const randomGreetings = [
                "Hi there! 👋 I'm Edi, your EduLink assistant. How can I help you today?",
                "Hello! 😊 Need help finding internships or info about EduLink?",
                "Hey! 👋 What can I do for you today?",
                "Greetings! How can I assist you on EduLink?"
            ];
            botReply(randomGreetings[Math.floor(Math.random() * randomGreetings.length)], [
                { label: 'Show Menu', value: 'menu' }
            ], [], true, true, updateMsgElem);
            return;
        }

        // Small talk & personality
        if (["thanks", "thank you", "thx", "appreciate it"].includes(text)) {
            botReply("You're welcome! 😊 If you have more questions, just ask.", [
                { label: 'Show Menu', value: 'menu' }
            ], [], false, true, updateMsgElem);
            return;
        }
        if (["bye", "goodbye", "see you", "later", "cya"].includes(text)) {
            botReply("Goodbye! 👋 Come back anytime if you need help.", [], [], false, true, updateMsgElem);
            return;
        }
        if (text.includes('what can you do') || text.includes('help me') || text.includes('your features')) {
            botReply("I can help you find internships, guide you through registration, answer questions about EduLink, and connect you to support. What would you like to do?", [
                { label: 'Find Internships', value: 'opportunities' },
                { label: 'How to Register', value: 'register' },
                { label: 'Contact Support', value: 'contact' },
                { label: 'Show Menu', value: 'menu' }
            ], [], false, true, updateMsgElem);
            return;
        }
        if (text.includes('who are you') || text.includes('your name')) {
            lastTopic = 'identity';
            botReply(`I'm Edi, your friendly guide to everything EduLink! I'm here to help you navigate the site and find opportunities.`, [
                { label: 'Show Menu', value: 'menu' }
            ], [], false, true, updateMsgElem);
            return;
        }
        if (text.includes('how are you')) {
            lastTopic = 'feeling';
            botReply(`I'm just a bunch of code, but I'm feeling great and ready to help! What can I do for you?`, [
                { label: 'Show Menu', value: 'menu' }
            ], [], false, true, updateMsgElem);
            return;
        }
        if (text === 'menu' || text === 'show menu') {
            lastTopic = 'help';
            botReply(
                "Here are some things I can help you with:",
                [
                    { label: 'Find Internships', value: 'opportunities' },
                    { label: 'How to Register', value: 'register' },
                    { label: 'Contact Support', value: 'contact' },
                    { label: 'About EduLink', value: 'about' },
                    { label: 'Privacy Policy', value: 'privacy' }
                ],
                [],
                false,
                true,
                updateMsgElem
            );
            return;
        }

        // Multi-turn conversation logic
        if (lastTopic === 'internship_field_query' && text) {
            lastTopic = 'internship';
            botReply(`Searching for internships in "${raw}"... While I connect to the backend (coming soon!), you can browse all current listings on our <a href="opportunities.html">Opportunities Page</a>.`, [], [], false, true, updateMsgElem);
            return;
        }

        // Easter Eggs & Personality
        if (text === 'tell me a joke') {
            lastTopic = 'joke';
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "I told my computer I needed a break, and now it won't stop sending me Kit-Kat ads.",
                "Why did the scarecrow win an award? Because he was outstanding in his field!"
            ];
            botReply(jokes[Math.floor(Math.random() * jokes.length)], [], [], false, true, updateMsgElem);
            return;
        }
        if (text.includes('privacy')) {
            lastTopic = 'privacy';
            botReply(
                'We take your privacy seriously. You can read our full Privacy Policy here: <a href="policy.html" target="_blank">Privacy Policy</a>.',
                [],
                [
                    { label: 'What data do you collect?', value: 'data' },
                    { label: 'How is my data used?', value: 'data use' }
                ],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('data use')) {
             lastTopic = 'data use';
             botReply(
                'We use your data to connect you with relevant opportunities, enhance our platform, and send you important updates. We never sell your data to third parties. Our <a href="policy.html">Privacy Policy</a> has all the details.',
                [],
                [
                    { label: 'What data do you collect?', value: 'data' },
                    { label: 'Contact support', value: 'contact' }
                ],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('data')) {
            lastTopic = 'data';
            botReply(
                "We collect essential information to build your professional profile, such as your name, contact details, educational background, and application history. For a detailed breakdown, please see our <a href=\"policy.html\">Privacy Policy</a>.",
                [],
                [
                    { label: 'How is my data used?', value: 'data use' },
                    { label: 'Contact support', value: 'contact' }
                ],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('contact')) {
            lastTopic = 'contact';
            botReply(
                'The best way to reach us is through our <a href="contact.html" target="_blank">Contact Page</a> or by emailing us directly at <a href="mailto:info@edulink.co.ke">info@edulink.co.ke</a>.',
                [],
                [
                    { label: 'What can you help with?', value: 'help' },
                    { label: 'Tell me about EduLink', value: 'about' }
                ],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('about')) {
            lastTopic = 'about';
            botReply(
                'EduLink is a platform dedicated to connecting Kenyan students with verified internships and graduate jobs, helping bridge the gap between education and career. Learn more on our <a href="about.html" target="_blank">About Us</a> page.',
                [],
                [
                    { label: 'Our partners', value: 'partner' },
                    { label: 'All opportunities', value: 'opportunities' }
                ],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('opportunity') || text.includes('internship') || text.includes('job')) {
            lastTopic = 'internship';
            botReply(
                `<b>Browse Verified Internships & Jobs</b><br>
                You can explore all our verified internships and graduate jobs on the <a href="opportunities.html" target="_blank">Opportunities Page</a>.<br><br>
                <b>How to use the page:</b>
                <ul style="margin:8px 0 8px 18px;padding:0;font-size:0.97em;">
                  <li>Filter by field (e.g., Tech, Finance, Marketing), location, or company.</li>
                  <li>Click <b>Apply</b> to start your application, or <b>Details</b> to learn more about a role.</li>
                  <li>All opportunities are posted by <b>verified employers</b>.</li>
                  <li>Track your applications and earn digital certificates for completed internships.</li>
                </ul>
                <b>What would you like to do next?</b>`,
                [
                  { label: 'Browse all opportunities', value: 'opportunities' },
                  { label: 'Filter by field', value: 'filter by field' },
                  { label: 'Profile tips', value: 'profile tips' },
                  { label: 'Application help', value: 'application help' },
                  { label: 'Show Menu', value: 'menu' }
                ],
                [
                  { label: 'Support for students', value: 'student support' }
                ],
                false,
                true,
                updateMsgElem
            );
            return;
        } else if (text.includes('support')) {
            lastTopic = 'support';
            botReply(
                'You can find FAQs and guides on our <a href="support.html" target="_blank">Support Page</a>. If you can\'t find your answer, feel free to ask me or contact our team!',
                [],
                [
                    { label: 'Contact support', value: 'contact' },
                    { label: 'How to register?', value: 'register' }
                ],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('login') || text.includes('sign in')) {
            lastTopic = 'login';
            botReply(
                'You can sign in to your account here: <a href="sign in.html" target="_blank">Sign In Page</a>. If you\'ve forgotten your password, you can use the "Forgot Password" link there to reset it.',
                [],
                [
                    { label: 'How to register?', value: 'register' },
                    { label: 'I need to verify my account', value: 'verify' }
                ],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('partner')) {
            lastTopic = 'partner';
            botReply(
                'We partner with leading companies and institutions. You can see some of our featured partners on the <a href="about.html#partners" target="_blank">About Page</a>.',
                [],
                [
                    { label: 'Tell me about EduLink', value: 'about' },
                    { label: 'Contact support', value: 'contact' }
                ],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('help') || text.includes('faq') || text === 'menu') {
            lastTopic = 'help';
            botReply(
                "I can help with any of the following topics. What would you like to know?",
                [
                    { label: 'Find Internships', value: 'opportunities' },
                    { label: 'How to Register', value: 'register' },
                    { label: 'Contact Support', value: 'contact' },
                    { label: 'About EduLink', value: 'about' },
                    { label: 'Privacy Policy', value: 'privacy' }
                ],
                [],
                false,
                true,
                updateMsgElem
            );
        } else if (text.includes('register')) {
            lastTopic = 'register';
            botReply(
                'To register for EduLink:<ol style="margin:8px 0 8px 18px;padding:0;font-size:0.97em;"><li>Go to the <a href="register.html" target="_blank">Registration Page</a>.</li><li>Fill in your details and submit the form.</li><li>Check your email for a verification link.</li><li>Click the link to activate your account.</li></ol>Need help with any step?',
                [
                    { label: 'How to verify my account?', value: 'verify' },
                    { label: 'Login help', value: 'login' },
                    { label: 'Show Menu', value: 'menu' }
                ],
                [],
                false,
                true,
                updateMsgElem
            );
            return;
        } else if (text.includes('filter by field')) {
            botReply(
                'You can filter internships and jobs by field (e.g., Tech, Finance, Marketing) directly on the <a href="opportunities.html" target="_blank">Opportunities Page</a>. Use the filter options at the top of the page to narrow your search.',
                [
                  { label: 'Browse all opportunities', value: 'opportunities' },
                  { label: 'Profile tips', value: 'profile tips' },
                  { label: 'Show Menu', value: 'menu' }
                ],
                [],
                false,
                true,
                updateMsgElem
            );
            return;
        } else if (text.includes('profile tips')) {
            botReply(
                'To stand out to employers, make sure your profile is 100% complete: upload a professional photo, write a clear bio, and detail your skills, education, and projects. <a href="support.html#faqAccordion" target="_blank">See more tips in our Student FAQ</a>.',
                [
                  { label: 'Application help', value: 'application help' },
                  { label: 'Show Menu', value: 'menu' }
                ],
                [],
                false,
                true,
                updateMsgElem
            );
            return;
        } else if (text.includes('application help')) {
            botReply(
                'When you find an opportunity you like, click <b>Apply</b> and follow the steps. You can track your applications from your dashboard. If you need more help, check our <a href="support.html#faqAccordion" target="_blank">Support Page</a> or ask me!',
                [
                  { label: 'Profile tips', value: 'profile tips' },
                  { label: 'Show Menu', value: 'menu' }
                ],
                [],
                false,
                true,
                updateMsgElem
            );
            return;
        } else if (text.includes('student support')) {
            botReply(
                'You can find FAQs and guides for students on our <a href="support.html#faqAccordion" target="_blank">Support Page</a>.',
                [
                  { label: 'Profile tips', value: 'profile tips' },
                  { label: 'Application help', value: 'application help' },
                  { label: 'Show Menu', value: 'menu' }
                ],
                [],
                false,
                true,
                updateMsgElem
            );
            return;
        } else if (text === 'opportunities' || text === 'browse all opportunities') {
            botReply(
                'You can browse all our verified internships and jobs on the <a href="opportunities.html" target="_blank">Opportunities Page</a>. Use the filters at the top to narrow by field, location, or company. Need help with anything else?',
                [
                  { label: 'Filter by field', value: 'filter by field' },
                  { label: 'Profile tips', value: 'profile tips' },
                  { label: 'Application help', value: 'application help' },
                  { label: 'Show Menu', value: 'menu' }
                ],
                [],
                false,
                true,
                updateMsgElem
            );
            return;
        } else {
            // Friendly client-side fallback for unmatched queries
            botReply("I'm here to help with EduLink info, registration, and opportunities! Try asking about internships, registration, or support—or use the menu.", [
                { label: 'Show Menu', value: 'menu' }
            ], [], true, true, updateMsgElem);
        }
    }

    // --- Welcome & Proactive Engagement ---
    function welcome(isProactive = false) {
        let welcomeMessage = `👋 Hi, I'm <b>${BOT_NAME}</b>, your EduLink Guide! What can I help you with today?`;
        let options = [
            { label: 'Find Internships', value: 'opportunities' },
            { label: 'How to Register', value: 'register' },
            { label: 'Contact Support', value: 'contact' }
        ];

        // Context-aware greeting
        const page = window.location.pathname.split('/').pop();
        if (page === 'opportunities.html') {
            welcomeMessage = `👋 Welcome to the Opportunities Hub! I'm <b>${BOT_NAME}</b>. I can help you understand how to filter, apply, or save jobs. What would you like to do?`;
            options = [
                { label: 'How to apply?', value: 'apply' },
                { label: 'Tell me about featured jobs', value: 'opportunities' },
                { label: 'Contact support', value: 'contact' }
            ];
        } else if (page === 'register.html') {
            welcomeMessage = `👋 Ready to join EduLink? I'm <b>${BOT_NAME}</b> and I can guide you through the registration process.`;
             options = [
                { label: 'Why should I join?', value: 'about' },
                { label: 'I need help verifying', value: 'verify' },
                { label: 'Is my data safe?', value: 'privacy' }
            ];
        }
        
        if (isProactive) {
            botReply(welcomeMessage, options, [], false, false);
        } else {
            messages.innerHTML = '';
            botReply(welcomeMessage, options, [], false);
        }
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
