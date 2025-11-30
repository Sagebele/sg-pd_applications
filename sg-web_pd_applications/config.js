// config.js
const Config = {
    ApplicationTitle: "Los Santos Police Department",
    Subtitle: "Application Form",

    Questions: {
        Step1: [
            { id: "email", label: "Email *", type: "email", placeholder: "Your Discord tag or email" },
            { id: "fullname", label: "Full Name *", type: "text", placeholder: "John Doe" },
            { id: "dob", label: "Date of Birth *", type: "date" },
            { id: "origin", label: "Where are you from? *", type: "text", placeholder: "City, Country" },
            { 
                id: "self_description", 
                label: "Describe yourself *", 
                type: "textarea", 
                placeholder: "Tell us about your personality, experience, and why you want to join the LSPD...",
                minWords: 10,
                maxWords: 40
            }
        ],

        PoliceQuestions: [
            { 
                type: "text", 
                question: "What do you think is the main role of a police officer in our city? *" 
            },
            { 
                type: "text", 
                question: "When is it appropriate to use force as an officer? Give a short explanation. *" 
            },
            { 
                type: "text", 
                question: "How important is radio communication during operations, and why? *" 
            },
            { 
                type: "text", 
                question: "How would you handle a situation where a civilian is being verbally aggressive but not physically violent? *" 
            },
        ],

        Scenarios: [
            { 
                type: "image",
                question: "You arrive first at a store robbery. The suspect claims to have a weapon but you cannot see it. Backup is 2 minutes out.",
                extra: "images/scenario1.png",
                placeholder: "Describe step-by-step how you would handle this situation..."
            },
            { 
                type: "text",
                question: "You witness another officer running a red light without emergency lights or valid reason. What do you do? *"
            }
        ]
    }
};