(function () {
	var STORAGE_KEY = "catarina_rsvp_v1";

	// ── EmailJS config ──────────────────────────────────────────
	// 1. Sign up at https://www.emailjs.com
	// 2. Add an email service (Gmail, Outlook, etc.) → copy Service ID
	// 3. Create an email template → copy Template ID
	//    Available template variables:
	//      {{family_name}}, {{phone}}, {{attending}},
	//      {{adults}}, {{kids}}, {{total}}, {{notes}}, {{submitted_at}}
	// 4. Go to Account → Public Key → copy it here
	var EMAILJS_PUBLIC_KEY = "Pjjwy6rfjzuNLW1Ab";
	var EMAILJS_SERVICE_ID = "service_fdbffnv";
	var EMAILJS_TEMPLATE_ID = "template_i4g3ldd";
	// ────────────────────────────────────────────────────────────

	emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

	// State
	var state = {
		attending: null,
		name: "",
		phone: "",
		adults: 2,
		kids: 1,
		notes: "",
		submittedAt: null,
	};
	var step = 0; // 0..5

	// DOM refs
	var $ = function (id) {
		return document.getElementById(id);
	};
	var stepWrap = $("rsvpStepWrap");
	var fill = $("rsvpFill");
	var stepLabel = $("rsvpStepLabel");
	var progress = $("rsvpProgress");
	var nav = $("rsvpNav");
	var errorEl = $("rsvpError");
	var btnBack = $("btnBack");
	var btnNext = $("btnNext");
	var btnSubmit = $("btnSubmit");

	// Restore from localStorage
	try {
		var saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			var parsed = JSON.parse(saved);
			if (parsed && parsed.submittedAt) {
				state = parsed;
				step = 5;
			}
		}
	} catch (e) {}

	function showStep(n) {
		step = n;
		var steps = stepWrap.querySelectorAll(".rsvp-step");
		for (var i = 0; i < steps.length; i++) {
			var sn = parseInt(steps[i].getAttribute("data-step"), 10);
			steps[i].hidden = sn !== n;
		}
		setError("");
		updateNav();
		updateProgress();
		if (n === 1) {
			var f = $("fName");
			if (f)
				setTimeout(function () {
					f.focus();
				}, 50);
		}
		if (n === 4) renderSummary();
		if (n === 5) renderDone();
	}

	// Steps for attending=true:  0, 1, 2, 4 (step 3 removed)
	// Steps for attending=false: 0, 1, 4
	function updateProgress() {
		if (step >= 5) {
			progress.style.display = "none";
			return;
		}
		progress.style.display = "";
		if (state.attending === false) {
			var mapNo = { 0: 0, 1: 1, 4: 2 };
			var idxNo = mapNo[step] !== undefined ? mapNo[step] : 0;
			fill.style.width = (idxNo / 2) * 100 + "%";
			stepLabel.textContent = "Passo " + (idxNo + 1) + " de 3";
		} else {
			var map = { 0: 0, 1: 1, 2: 2, 4: 3 };
			var idx = map[step] !== undefined ? map[step] : 0;
			fill.style.width = (idx / 3) * 100 + "%";
			stepLabel.textContent = "Passo " + (idx + 1) + " de 4";
		}
	}

	function updateNav() {
		if (step >= 5) {
			nav.style.display = "none";
			return;
		}
		nav.style.display = "";
		btnBack.hidden = step === 0;
		btnNext.hidden = step === 4;
		btnSubmit.hidden = step !== 4;
	}

	function setError(msg) {
		if (msg) {
			errorEl.textContent = msg;
			errorEl.hidden = false;
		} else {
			errorEl.textContent = "";
			errorEl.hidden = true;
		}
	}

	// Step 0 — attend selection
	document.querySelectorAll(".attend-card").forEach(function (btn) {
		btn.addEventListener("click", function () {
			var v = btn.getAttribute("data-attend");
			state.attending = v === "yes";
			document.querySelectorAll(".attend-card").forEach(function (b) {
				b.classList.remove("selected", "yes", "no");
			});
			btn.classList.add("selected", state.attending ? "yes" : "no");
			var paws = btn.querySelectorAll("[data-icon-yes] ellipse");
			paws.forEach(function (el) {
				el.setAttribute("fill", state.attending ? "#fff" : "#3a6b2e");
			});
			var nos = btn.querySelectorAll("[data-icon-no] svg *");
			nos.forEach(function (el) {
				if (
					el.tagName.toLowerCase() === "circle" ||
					el.tagName.toLowerCase() === "path"
				) {
					el.setAttribute(
						"stroke",
						!state.attending ? "#fff" : "#9a7a3a",
					);
				}
			});
		});
	});

	// Counters
	document.querySelectorAll(".counter-btn").forEach(function (btn) {
		btn.addEventListener("click", function () {
			var which = btn.getAttribute("data-counter");
			var d = parseInt(btn.getAttribute("data-delta"), 10);
			state[which] = Math.max(0, Math.min(10, state[which] + d));
			updateCounters();
		});
	});

	function updateCounters() {
		$("vAdults").textContent = state.adults;
		$("vKids").textContent = state.kids;
		var total = state.adults + state.kids;
		$("totalPeople").textContent = total;
		$("totalPeopleLabel").textContent = total === 1 ? "pessoa" : "pessoas";
		document.querySelectorAll(".counter-btn").forEach(function (btn) {
			var w = btn.getAttribute("data-counter");
			var d = parseInt(btn.getAttribute("data-delta"), 10);
			btn.disabled =
				(d < 0 && state[w] <= 0) || (d > 0 && state[w] >= 10);
		});
	}

	// Field bindings
	function bindField(id, key) {
		var el = $(id);
		if (!el) return;
		el.addEventListener("input", function () {
			state[key] = el.value;
		});
	}
	bindField("fName", "name");
	bindField("fPhone", "phone");
	bindField("fNotes", "notes");

	function refreshStep4Copy() {
		$("step4Title").textContent = state.attending
			? "Alguma observação?"
			: "Quer deixar uma mensagem?";
		$("step4Label").textContent = state.attending
			? "Restrições alimentares, alergias, etc."
			: "Mensagem para a Catarina";
		$("fNotes").placeholder = state.attending
			? "Ex: alergia a amendoim"
			: "Ex: Mande beijos pra ela!";
	}

	function renderSummary() {
		refreshStep4Copy();
		var ul = $("summaryList");
		var items = [];
		items.push(
			"<li><strong>Status:</strong> " +
				(state.attending ? "Vamos! 🌿" : "Não poderemos ir 💛") +
				"</li>",
		);
		if (state.name)
			items.push(
				"<li><strong>Família:</strong> " +
					escapeHtml(state.name) +
					"</li>",
			);
		if (state.attending)
			items.push(
				"<li><strong>Pessoas:</strong> " +
					state.adults +
					" adultos, " +
					state.kids +
					" crianças</li>",
			);
		ul.innerHTML = items.join("");
	}

	function renderDone() {
		var icon = $("doneIcon");
		icon.innerHTML = state.attending
			? '<svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true"><ellipse cx="50" cy="65" rx="22" ry="18" fill="#3a6b2e"/><ellipse cx="25" cy="40" rx="9" ry="12" fill="#3a6b2e"/><ellipse cx="42" cy="28" rx="9" ry="12" fill="#3a6b2e"/><ellipse cx="58" cy="28" rx="9" ry="12" fill="#3a6b2e"/><ellipse cx="75" cy="40" rx="9" ry="12" fill="#3a6b2e"/></svg>'
			: '<svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true"><path d="M50 20 C 30 20, 20 35, 30 55 L 50 85 L 70 55 C 80 35, 70 20, 50 20 Z" fill="#c44a2c"/></svg>';
		$("doneTitle").textContent = state.attending
			? "Confirmação recebida!"
			: "Mensagem recebida 💛";
		$("doneSub").textContent = state.attending
			? "Obrigada! A Catarina vai adorar saber que vocês vêm. Te vemos no dia 06/06!"
			: "Obrigada por avisar! Vamos sentir sua falta.";
		var info =
			"<div><span>Família</span><strong>" +
			(escapeHtml(state.name) || "—") +
			"</strong></div>";
		if (state.attending)
			info +=
				"<div><span>Pessoas</span><strong>" +
				(state.adults + state.kids) +
				"</strong></div>";
		info += "<div><span>Data</span><strong>06 / 06 / 2026</strong></div>";
		$("doneInfo").innerHTML = info;

		// Confetti
		var c = $("confetti");
		if (c && !c.dataset.rendered) {
			var bits = "";
			for (var i = 0; i < 24; i++) {
				bits +=
					'<span class="confetti-bit c' +
					(i % 6) +
					'" style="left:' +
					((i * 4.3) % 100) +
					"%;animation-delay:" +
					(i % 8) * 0.1 +
					's"></span>';
			}
			c.innerHTML = bits;
			c.dataset.rendered = "1";
		}
	}

	function escapeHtml(s) {
		return String(s || "").replace(/[&<>"']/g, function (c) {
			return {
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			}[c];
		});
	}

	function next() {
		setError("");
		if (step === 0 && state.attending === null) {
			setError("Por favor, escolha uma opção");
			return;
		}
		if (step === 0 && state.attending === false) {
			showStep(1);
			return;
		}
		if (step === 1 && !state.name.trim()) {
			setError("Digite o nome da família");
			return;
		}
		if (step === 1 && state.attending === false) {
			showStep(4);
			return;
		}
		if (step === 2) {
			showStep(4);
			return;
		}
		showStep(Math.min(step + 1, 5));
	}

	function back() {
		setError("");
		if (step === 4 && state.attending === false) {
			showStep(1);
			return;
		}
		if (step === 4) {
			showStep(2);
			return;
		}
		showStep(Math.max(step - 1, 0));
	}

	function submit() {
		var params = {
			family_name: state.name || "—",
			phone: state.phone || "—",
			attending: state.attending
				? "Sim, vamos! 🌿"
				: "Não poderemos ir 💛",
			adults: state.attending ? state.adults : "—",
			kids: state.attending ? state.kids : "—",
			total: state.attending ? state.adults + state.kids : "—",
			notes: state.notes || "—",
			submitted_at: new Date().toLocaleString("en-US"),
		};

		btnSubmit.disabled = true;
		btnSubmit.textContent = "Enviando…";

		emailjs
			.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
			.then(function () {
				state.submittedAt = new Date().toISOString();
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
				} catch (e) {}
				showStep(5);
			})
			.catch(function () {
				setError("Erro ao enviar. Por favor, tente novamente.");
				btnSubmit.disabled = false;
				btnSubmit.textContent = "Enviar confirmação ✓";
			});
	}

	function reset() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch (e) {}
		state = {
			attending: null,
			name: "",
			phone: "",
			adults: 2,
			kids: 1,
			notes: "",
			submittedAt: null,
		};
		document.querySelectorAll(".attend-card").forEach(function (b) {
			b.classList.remove("selected", "yes", "no");
		});
		$("fName").value = "";
		$("fPhone").value = "";
		$("fNotes").value = "";
		updateCounters();
		showStep(0);
	}

	btnBack.addEventListener("click", back);
	btnNext.addEventListener("click", next);
	btnSubmit.addEventListener("click", submit);
	$("btnReset").addEventListener("click", reset);

	// Hydrate UI from saved state
	if (state.name) $("fName").value = state.name;
	if (state.phone) $("fPhone").value = state.phone;
	if (state.notes) $("fNotes").value = state.notes;
	if (state.attending !== null) {
		var sel = document.querySelector(
			'.attend-card[data-attend="' +
				(state.attending ? "yes" : "no") +
				'"]',
		);
		if (sel) sel.classList.add("selected", state.attending ? "yes" : "no");
	}
	updateCounters();
	showStep(step);
})();
