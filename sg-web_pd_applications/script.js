// --- Hardcoded Config (converted from your config.lua) ---
const Config = {
    ApplicationTitle: "Los Santos Police Department",
    Subtitle: "Application Form",
    Questions: {
        Step1: [
            { id: "fullname", label: "Full Name *", type: "text", placeholder: "John Doe" },
            { id: "dob", label: "Date of Birth *", type: "date" },
            { id: "origin", label: "Where are you from? *", type: "text", placeholder: "Los Santos, USA" },
            {
                id: "self_description",
                label: "Describe yourself *",
                type: "textarea",
                placeholder: "Tell us about yourself...",
                word_min: 10,
                word_max: 40,
            },
        ],
        PoliceQuestions: [
            {
                id: "role",
                label: "Write the most important one!... *",
                type: "textarea",
                question: "What is the main role of a police officer? *",
                word_min: 10,
                word_max: 100,
            },
            {
                id: "force",
                label: "Answer here shortly... *",
                type: "textarea",
                question: "What is the fourth use of force?",
                word_min: 15,
                word_max: 80,
            },
            {
                id: "experience",
                label: "Previous police experience",
                type: "textarea",
                question: "What previous police experience do you have?*",
                word_min: 10,
                word_max: 50,
            },
            {
                id: "stress",
                label: "handle stressful situations*",
                type: "textarea",
                question:
                    "How do you handle stressful situations while on duty? Describe a situation where you handled a stressfull situation.",
                word_min: 10,
                word_max: 50,
            },
        ],
        Scenarios: [
            {
                id: "robbery",
                label: "Write two or three sentences! *",
                type: "scenario",
                question: "You arrive at a store robbery, what is your first action?",
                image: "images/scenario1.png",
                word_min: 10,
                word_max: 50,
            },
            {
                id: "officer_misconduct",
                label: "What would you do? *",
                type: "scenario",
                question:
                    "You witness another officer breaking traffic laws without valid reason. What do you do?",
                word_min: 10,
                word_max: 50,
            },
        ],
    },
};

let QUESTIONS = Config.Questions;

// DOM elements (same IDs as your existing HTML)
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const submitBtn = document.getElementById("submitBtn");
const msg = document.getElementById("message");
const progress = document.querySelector(".progress");
const container = document.querySelector(".container");
const step1Nav = document.getElementById("step1-nav");

// --- Web init: no NUI messages --- //
document.addEventListener("DOMContentLoaded", () => {
    // Show page normally
    document.body.style.display = "flex";
    container.style.display = "block";

    // Set titles from Config
    document.getElementById("title").textContent =
        Config.ApplicationTitle || "Police Application";
    document.getElementById("subtitle").textContent = Config.Subtitle || "";

    // Clear and render form
    step1.innerHTML = "";
    document.getElementById("police-questions").innerHTML = "";
    document.getElementById("scenario-questions").innerHTML = "";
    msg.textContent = "";
    msg.className = "message";

    renderStep1();
    renderQuestions();
    showStep(1);
});

// ENTER key behaviour still works, just without closing FiveM
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && step1.classList.contains("active")) {
        if (validateStep1()) showStep(2);
    } else if (e.key === "Enter" && step2.classList.contains("active")) {
        if (validateStep2() && submitBtn.textContent === "Submit Application") {
            submitBtn.onclick();
        }
    }
});

function renderStep1(){
    if (!Config || !Config.Questions) {
        console.error('Config or Config.Questions is not defined');
        return;
    }

    // Clear previous content if any
    step1.innerHTML = '';

    // Render Step 1 (static)
    Config.Questions.Step1.forEach(field => {
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = field.label;
        label.setAttribute('for', field.id);

        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.placeholder = field.placeholder || '';
            input.rows = 4;

            if (field.word_min && field.word_max) {
                const hint = document.createElement('small');
                hint.id = 'wordHint-self';
                hint.textContent = `Words: 0 (${field.word_min}–${field.word_max})`;
                hint.style.display = 'block';
                hint.style.marginTop = '5px';
                hint.style.color = '#666';

                input.addEventListener('input', () => {
                    const words = countWords(input.value);
                    hint.textContent = `Words: ${words} (${field.word_min}–${field.word_max})`;
                    hint.style.color = (words < field.word_min || words > field.word_max) ? 'red' : 'green';
                });

                div.appendChild(label);
                div.appendChild(input);
                div.appendChild(hint);
                // set id after building
                input.id = field.id;
                step1.appendChild(div);
                return;
            }
        } else {
            input = document.createElement('input');
            input.type = field.type || 'text';
            input.placeholder = field.placeholder || '';
        }

        // IMPORTANT: this must be the final id, matching Config.Step1[i].id
        input.id = field.id;

        div.appendChild(label);
        div.appendChild(input);
        step1.appendChild(div);
    });
}

function renderQuestions() {
    const policeContainer = document.getElementById("police-questions");
    const scenarioContainer = document.getElementById("scenario-questions");

    if (!policeContainer || !scenarioContainer) {
        console.error("Missing police-questions or scenario-questions containers");
        return;
    }

    policeContainer.innerHTML = "";
    scenarioContainer.innerHTML = "";

    const policeQuestions = (QUESTIONS && QUESTIONS.PoliceQuestions) || [];
    const scenarioQuestions = (QUESTIONS && QUESTIONS.Scenarios) || [];

    policeQuestions.forEach((q) => {
        const div = buildQuestionBlock(q);
        policeContainer.appendChild(div);
    });

    scenarioQuestions.forEach((q) => {
        const div = buildQuestionBlock(q);
        scenarioContainer.appendChild(div);
    });
}

function buildQuestionBlock(q) {
    const div = document.createElement("div");
    div.className = "question-block";
    div.style.marginBottom = "30px";

    const label = document.createElement("label");
    const isRequired = q.label && q.label.includes("*");
    const questionText = q.question || q.question_text || "";
    label.innerHTML = questionText + (isRequired ? ' <span style="color:red">*</span>' : "");
    div.appendChild(label);

    if (q.image) {
        const img = document.createElement("img");
        img.src = q.image;
        img.className = "question-image";
        div.appendChild(img);
    }

    const textarea = document.createElement("textarea");
    textarea.id = `answer-${q.id}`;
    const min = q.word_min || 0;
    const max = q.word_max || 9999;
    textarea.placeholder = `Minimum ${min} words, maximum ${max}...`;
    textarea.rows = q.type === "scenario" ? 8 : 5;
    textarea.style.width = "100%";
    textarea.style.marginTop = "10px";

    const hint = document.createElement("small");
    hint.id = `hint-${q.id}`;
    hint.textContent = `Words: 0 (${min}–${max})`;
    hint.className = "word-hint";

    textarea.addEventListener("input", () => {
        const words = countWords(textarea.value);
        hint.textContent = `Words: ${words} (${min}–${max})`;
        if (words === 0) {
            hint.className = "word-hint";
        } else if (words < min || words > max) {
            hint.className = "word-hint bad";
        } else {
            hint.className = "word-hint good";
        }
    });

    div.appendChild(textarea);
    div.appendChild(hint);
    return div;
}

// ---------- Utils & validation ----------

function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function validateStep1() {
    msg.textContent = '';
    msg.className = 'message';

    if (!Config || !Config.Questions || !Config.Questions.Step1) {
        // No config => nothing to validate
        return true;
    }

    // Explicit list of required Step 1 fields
    const requiredIds = ['fullname', 'dob', 'origin', 'self_description'];

    for (const fieldId of requiredIds) {
        const el = document.getElementById(fieldId);

        if (!el || !el.value || !el.value.trim()) {
            container.scrollTop = 0;
            msg.textContent = 'Please fill all required fields.';
            msg.classList.add('error');

            // Debug info in console if needed
            console.warn('Step1 validation: empty or missing field', fieldId, el);
            return false;
        }
    }

    // Extra check just for the self_description word count
    const selfEl = document.getElementById('self_description');
    if (selfEl) {
        const words = countWords(selfEl.value);
        const min = 10;
        const max = 40;
        if (words < min || words > max) {
            container.scrollTop = 0;
            msg.textContent = `Self description must be ${min}–${max} words.`;
            msg.classList.add('error');
            console.warn('Step1 validation: self_description word count', words);
            return false;
        }
    }

    return true;
}


function validateStep2() {
    msg.textContent = "";
    msg.className = "message";

    const policeQuestions = (QUESTIONS && QUESTIONS.PoliceQuestions) || [];
    const scenarioQuestions = (QUESTIONS && QUESTIONS.Scenarios) || [];
    const allQuestions = policeQuestions.concat(scenarioQuestions);

    for (const q of allQuestions) {
        const el = document.getElementById(`answer-${q.id}`);
        if (!el) continue;

        const answer = el.value.trim();
        const words = countWords(answer);
        const min = q.word_min || 0;
        const max = q.word_max || 9999;
        const isRequired = q.label && q.label.includes("*");

        if (isRequired && !answer) {
            container.scrollTop = 0;
            msg.textContent = `Please answer: "${(q.question || "").substring(0, 50)}..."`;
            msg.classList.add("error");
            return false;
        }
        if (answer && (words < min || words > max)) {
            container.scrollTop = 0;
            msg.textContent = `Question must be ${min}–${max} words.`;
            msg.classList.add("error");
            return false;
        }
    }
    return true;
}

// ---------- Navigation & submit ----------

nextBtn.onclick = () => {
    if (validateStep1()) showStep(2);
    container.scrollTop = 0;
};

prevBtn.onclick = () => {
    showStep(1);
    container.scrollTop = 0;
};

function showStep(n) {
    step1.classList.toggle("active", n === 1);
    step2.classList.toggle("active", n === 2);

    progress.style.width = n === 1 ? "50%" : "100%";

    if (step1Nav) {
        step1Nav.classList.toggle("hidden", n !== 1);
    }
    container.scrollTop = 0;
}

submitBtn.onclick = () => {
    if (!validateStep2()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const payload = {
        answers: {},
    };

    const step1Fields = (QUESTIONS && QUESTIONS.Step1) || [];
    const policeQuestions = (QUESTIONS && QUESTIONS.PoliceQuestions) || [];
    const scenarioQuestions = (QUESTIONS && QUESTIONS.Scenarios) || [];

    step1Fields.forEach((q) => {
        const el = document.getElementById(q.id);
        const val = el ? el.value : "";
        payload.answers[q.id] = val ? val.trim() : "";
    });

    policeQuestions.forEach((q) => {
        const el = document.getElementById(`answer-${q.id}`);
        payload.answers[q.id] = el ? el.value.trim() : "";
    });

    scenarioQuestions.forEach((q) => {
        const el = document.getElementById(`answer-${q.id}`);
        payload.answers[q.id] = el ? el.value.trim() : "";
    });

    // For now, just show success and log the payload.
    console.log("Application payload:", payload);

    msg.className = "message success";
    msg.textContent = "Application submitted successfully! (Check console for payload)";
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Application";
};
