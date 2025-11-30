// Configuration passed from Lua
let Config = {}; // Will be set from Lua
// Application state
let QUESTIONS = []; // Will be set from Lua
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const submitBtn = document.getElementById('submitBtn');
const msg = document.getElementById('message');
const progress = document.querySelector('.progress');
const container = document.querySelector('.container');
const step1Nav = document.getElementById('step1-nav'); 



// NUI Listeners
window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.action) return;

    if (data.action === "open") {
        Config = data.config || {};

        if (!Config.Questions) {
            console.error("Config.Questions is missing, cannot render form");
            return;
        }

        QUESTIONS = Config.Questions;

        document.getElementById('title').textContent = Config.ApplicationTitle || 'Police Application';
        document.getElementById('subtitle').textContent = Config.Subtitle || '';

        document.body.style.display = 'flex';   // keep centered
        container.style.display = 'block';

        // Clear previous content
        step1.innerHTML = '';
        document.getElementById('police-questions').innerHTML = '';
        document.getElementById('scenario-questions').innerHTML = '';
        msg.textContent = '';
        msg.className = 'message';

        renderStep1();
        renderQuestions();
        showStep(1);
    }

    if (data.action === 'close') {
        document.body.style.display = 'none';
        container.style.display = 'none';
        cleanupForm();
    }

    if (data.action === 'submitResult') {
        const result = data.result;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';

        msg.className = 'message';

        if (result && result.success) {
            msg.textContent = result.message || 'Application submitted successfully!';
            msg.classList.add('success');
            setTimeout(() => {
                fetch(`https://${GetParentResourceName()}/close`, { method: 'POST' });
            }, 4000);
        } else {
            msg.textContent = (result && result.error) || 'Submission failed.';
            msg.classList.add('error');
        }
    }
});

// Initially hide
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        fetch(`https://${GetParentResourceName()}/close`, { method: 'POST' });
        cleanupForm();
    }

    if (e.key === 'Enter' && step1.classList.contains('active')) {
        if (validateStep1()) showStep(2);
    }
    else if (e.key === 'Enter' && step2.classList.contains('active')) {
        if (validateStep2() && submitBtn.textContent == 'Submit Application') {
            submitBtn.onclick();
        }
    }
});


function renderStep1(){
    if(!Config || !Config.Questions){
        console.error('Config or Config.Questions is not defined');
        return;
    }
    // Render Step 1 (static)
    Config.Questions.Step1.forEach(field => {
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = field.label;
        label.setAttribute('for', field.id);

        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.id = `answer-${field.id}`;
            input.placeholder = field.placeholder;
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
            }
        } else {
            input = document.createElement('input');
            input.type = field.type;
            input.placeholder = field.placeholder || '';
        }

        input.id = field.id;
        div.appendChild(label);
        div.appendChild(input);
        step1.appendChild(div);
    });
}



// Cleanup
function cleanupForm() {
    if (Config && Config.Questions && Config.Questions.Step1) {
        Config.Questions.Step1.forEach(field => {
            const el = document.getElementById(field.id);
            if (el) el.value = '';
        });
    }

    if (Config && Config.Questions) {
        ['PoliceQuestions', 'Scenarios'].forEach(section => {
            const group = Config.Questions[section];
            if (group) {
                group.forEach(q => {
                    const el = document.getElementById(`answer-${q.id}`);
                    if (el) el.value = '';
                });
            }
        });
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';
    msg.textContent = '';
    msg.className = 'message';
}

// Render dynamic questions split into police + scenarios
function renderQuestions() {
    const policeContainer = document.getElementById('police-questions');
    const scenarioContainer = document.getElementById('scenario-questions');

    if (!policeContainer || !scenarioContainer) {
        console.error('Missing police-questions or scenario-questions containers');
        return;
    }

    policeContainer.innerHTML = '';
    scenarioContainer.innerHTML = '';

    const policeQuestions = (QUESTIONS && QUESTIONS.PoliceQuestions) || [];
    const scenarioQuestions = (QUESTIONS && QUESTIONS.Scenarios) || [];

    policeQuestions.forEach(q => {
        const div = buildQuestionBlock(q);
        policeContainer.appendChild(div);
    });

    scenarioQuestions.forEach(q => {
        const div = buildQuestionBlock(q);
        scenarioContainer.appendChild(div);
    });
}

function buildQuestionBlock(q) {
    const div = document.createElement('div');
    div.className = 'question-block';
    div.style.marginBottom = '30px';

    const label = document.createElement('label');
    const isRequired = q.label && q.label.includes('*');
    const questionText = q.question || q.question_text || '';
    label.innerHTML = questionText + (isRequired ? ' <span style="color:red">*</span>' : '');
    div.appendChild(label);

    if (q.image) {
        const img = document.createElement('img');
        img.src = q.image;
        img.className = 'question-image';
        div.appendChild(img);
    }

    const textarea = document.createElement('textarea');
    textarea.id = `answer-${q.id}`;
    const min = q.word_min || 0;
    const max = q.word_max || 9999;
    textarea.placeholder = `Minimum ${min} words, maximum ${max}...`;
    textarea.rows = q.type === 'scenario' ? 8 : 5;
    textarea.style.width = '100%';
    textarea.style.marginTop = '10px';

    const hint = document.createElement('small');
    hint.id = `hint-${q.id}`;
    hint.textContent = `Words: 0 (${min}–${max})`;
    hint.className = 'word-hint';

    textarea.addEventListener('input', () => {
        const words = countWords(textarea.value);
        hint.textContent = `Words: ${words} (${min}–${max})`;
        if (words === 0) {
            hint.className = 'word-hint';
        } else if (words < min || words > max) {
            hint.className = 'word-hint bad';
        } else {
            hint.className = 'word-hint good';
        }
    });

    div.appendChild(textarea);
    div.appendChild(hint);
    return div;
}

function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function validateStep1() {
    msg.textContent = '';
    msg.className = 'message';

    if (!Config || !Config.Questions || !Config.Questions.Step1) return true;

    for (const field of Config.Questions.Step1) {
        const el = document.getElementById(field.id);
        if (!el) continue;

        if (field.label && field.label.includes('*') && !el.value.trim()) {
            container.scrollTop = 0;
            msg.textContent = 'Please fill all required fields.';
            msg.classList.add('error');
            return false;
        }

        if (field.word_min) {
            const words = countWords(el.value);
            if (words < field.word_min || words > field.word_max) {
                container.scrollTop = 0;
                msg.textContent = `Self description must be ${field.word_min}–${field.word_max} words.`;
                msg.classList.add('error');
                return false;
            }
        }
    }
    return true;
}

function validateStep2() {
    msg.textContent = '';
    msg.className = 'message';

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
        const isRequired = q.label && q.label.includes('*');

        if (isRequired && !answer) {
            container.scrollTop = 0;
            msg.textContent = `Please answer: "${(q.question || '').substring(0, 50)}..."`;
            msg.classList.add('error');
            return false;
        }
        if (answer && (words < min || words > max)) {
            container.scrollTop = 0;
            msg.textContent = `Question must be ${min}–${max} words.`;
            msg.classList.add('error');
            return false;
        }
    }
    return true;
}

nextBtn.onclick = () => { 
    if (validateStep1()) showStep(2); 
    container.scrollTop = 0;
};
prevBtn.onclick = () => {
    showStep(1);
    container.scrollTop = 0;
}

function showStep(n) {
    // swap active step
    step1.classList.toggle('active', n === 1);
    step2.classList.toggle('active', n === 2);

    // progress bar
    progress.style.width = (n === 1) ? '50%' : '100%';

    // show Next only on step 1
    if (step1Nav) {
        step1Nav.classList.toggle('hidden', n !== 1);
    }
    container.scrollTop = 0;
}

submitBtn.onclick = async () => {

    if (!validateStep2()) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    const payload = {
        answers: {}
    };

    const step1Fields = (QUESTIONS && QUESTIONS.Step1) || [];
    const policeQuestions = (QUESTIONS && QUESTIONS.PoliceQuestions) || [];
    const scenarioQuestions = (QUESTIONS && QUESTIONS.Scenarios) || [];

    step1Fields.forEach(q => {
    const el = document.getElementById(q.id).value;
    payload.answers[q.id] = el ? el.trim() : '';
    });

    policeQuestions.forEach(q => {
        const el = document.getElementById(`answer-${q.id}`);
        payload.answers[q.id] = el ? el.value.trim() : '';
    });

    scenarioQuestions.forEach(q => {
        const el = document.getElementById(`answer-${q.id}`);
        payload.answers[q.id] = el ? el.value.trim() : '';
    });
    //printing the payload.answers 
    // for (const key in payload.answers) {
    //     if (Object.hasOwnProperty.call(payload.answers, key)) {
    //         console.log(`${key}:`, payload.answers[key]);
    //     }
    // }

    try {
        await fetch(`https://${GetParentResourceName()}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // Result is handled via 'submitResult' from client.lua
    } catch (err) {
        msg.textContent = 'Submission failed: ' + err.message;
        msg.classList.add('error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
    }
};