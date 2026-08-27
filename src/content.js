// Meta Ads Library Downloader - content.js
// Localiza vídeos na página, cria botões de download e envia a URL para o service worker.

function getVideoUrl(video) {
    try {
        const url = video.currentSrc || video.src || "";
        if (url && url.trim().length > 0) {
            return url;
        }
        return null;
    } catch (error) {
        console.error("[Meta Downloader]", error);
        return null;
    }
}

function requestDownload(url) {
    try {
        chrome.runtime.sendMessage({
            action: "downloadVideo",
            url: url
        });
        console.log("[Meta Downloader] Download solicitado");
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }
}

function createDownloadButton(video, url) {
    const button = document.createElement("button");
    button.className = "meta-downloader-button";
    button.type = "button";
    button.textContent = "⬇ Baixar vídeo";

    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const currentUrl = getVideoUrl(video) || url;
        if (!currentUrl) {
            console.error("[Meta Downloader]", "URL do vídeo indisponível no momento do clique");
            return;
        }
        requestDownload(currentUrl);
    });

    return button;
}

function processVideo(video) {
    try {
        // Evita duplicar botão se já processado
        if (video.dataset.metaDownloaderProcessed === "true") {
            return;
        }

        const url = getVideoUrl(video);

        if (!url) {
            // Ainda sem src/currentSrc, tenta novamente em uma próxima varredura
            return;
        }

        // Evita duplicar botão caso já exista um irmão criado para este vídeo
        const parent = video.parentElement;
        if (!parent) {
            return;
        }

        const alreadyHasButton = parent.querySelector(":scope > .meta-downloader-button");
        if (alreadyHasButton) {
            video.dataset.metaDownloaderProcessed = "true";
            return;
        }

        const button = createDownloadButton(video, url);

        // Garante que o container consiga posicionar o botão sobre/perto do vídeo
        if (getComputedStyle(parent).position === "static") {
            parent.style.position = "relative";
        }

        parent.appendChild(button);

        // Só marca como processado permanentemente quando a URL válida foi obtida
        video.dataset.metaDownloaderProcessed = "true";

        console.log("[Meta Downloader] Vídeo encontrado:", url);
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }
}

function scanVideos() {
    try {
        const videos = document.querySelectorAll("video");
        videos.forEach((video) => {
            processVideo(video);
        });
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }
}

// =====================================================================
// Filtro por tempo de veiculação do anúncio
// =====================================================================

// Estado global do filtro (0 = "Todos")
let currentFilterDays = 0;
let currentFilterCta = "all";

const CTA_GROUPS = [
    {
        key: "contact",
        label: "Foco em contato",
        items: ["Fale conosco", "Enviar mensagem", "Enviar mensagem pelo WhatsApp", "Enviar e-mail", "Ligar agora"]
    },
    {
        key: "sales",
        label: "Foco em conversão/vendas",
        items: ["Comprar agora", "Pedir agora", "Fazer pedido", "Ver cardápio", "Ver ofertas", "Adicionar ao carrinho"]
    },
    {
        key: "leads",
        label: "Foco em cadastro/leads",
        items: ["Cadastrar-se", "Inscrever-se", "Baixar", "Usar aplicativo"]
    },
    {
        key: "engagement",
        label: "Foco em engajamento/informação",
        items: ["Saiba mais", "Assista ao vídeo", "Salvar", "Jogar"]
    },
    {
        key: "local",
        label: "Foco em local/evento",
        items: ["Reserve agora", "Reservar agora", "Como chegar", "Visitar o perfil do Instagram"]
    }
];

function normalizeCta(value) {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function getCtaDefinition(cta) {
    const normalizedCta = normalizeCta(cta);
    for (const group of CTA_GROUPS) {
        if (group.items.some((item) => normalizeCta(item) === normalizedCta)) {
            return { value: normalizedCta, category: group.key };
        }
    }
    return null;
}

function extractCta(card) {
    try {
        const interactiveElements = card.querySelectorAll("a, button, [role='button']");
        for (const element of interactiveElements) {
            const candidates = [element.innerText, element.getAttribute("aria-label")];
            for (const candidate of candidates) {
                const definition = getCtaDefinition(candidate);
                if (definition) {
                    return { ...definition, label: candidate.trim() };
                }
            }
        }
    } catch (error) {
        console.error("[Meta Downloader] Não foi possível extrair a CTA:", error);
    }
    return null;
}

// Meses abreviados em português usados pela Meta Ads Library
const MONTHS_PT = {
    jan: 0,
    fev: 1,
    mar: 2,
    abr: 3,
    mai: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    set: 8,
    out: 9,
    nov: 10,
    dez: 11
};

/**
 * Extrai o Library ID de um card, a partir do texto
 * "Identificação da biblioteca: 1234567890"
 */
function extractLibraryId(card) {
    try {
        const text = card.innerText || "";
        return text.match(/Identifica[cç][aã]o da biblioteca:\s*(\d+)/i)?.[1] || null;
    } catch (error) {
        console.error("[Meta Downloader]", error);
        return null;
    }
}

/**
 * Extrai a data de início de veiculação a partir do texto do card.
 * Formato esperado: "Veiculação iniciada em 19 de mar de 2026"
 */
function extractStartDate(card) {
    try {
        const text = card.innerText || "";

        const match = text.match(
            /Veicula[cç][aã]o iniciada em\s+(\d{1,2})\s+de\s+([a-zç]{3})\s+de\s+(\d{4})/i
        );

        if (!match) {
            return null;
        }

        const [, day, month, year] = match;
        const monthNumber = MONTHS_PT[month.toLowerCase()];

        if (monthNumber === undefined) {
            return null;
        }

        const date = new Date(Number(year), monthNumber, Number(day));

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    } catch (error) {
        console.error("[Meta Downloader]", error);
        return null;
    }
}

/**
 * Calcula quantos dias inteiros se passaram desde startDate até hoje,
 * comparando apenas as datas (sem horas/minutos).
 */
function calculateActiveDays(startDate) {
    try {
        if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
            return null;
        }

        const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffMs = today.getTime() - start.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        return diffDays >= 0 ? diffDays : null;
    } catch (error) {
        console.error("[Meta Downloader]", error);
        return null;
    }
}

/**
 * Verifica se um elemento contém exatamente uma ocorrência de
 * "Identificação da biblioteca:", indicando que representa um único anúncio.
 */
function hasSingleLibraryId(element) {
    const text = element.innerText || "";
    const ids = text.match(/Identifica[cç][aã]o da biblioteca:\s*\d+/gi) || [];
    return ids.length === 1;
}

/**
 * Sobe pela árvore DOM a partir de um elemento interno (ex: <video> ou o
 * elemento que contém a data) até encontrar o menor container que ainda
 * representa um único anúncio (exatamente 1 "Identificação da biblioteca"
 * e contém "Veiculação iniciada em").
 */
function findAdCard(startElement) {
    try {
        let current = startElement;
        let lastValid = null;

        while (current && current !== document.body) {
            const text = current.innerText || "";

            const ids = text.match(/Identifica[cç][aã]o da biblioteca:\s*\d+/gi) || [];
            const hasStartDate = /Veicula[cç][aã]o iniciada em/i.test(text);

            if (ids.length === 1 && hasStartDate) {
                lastValid = current;
            }

            if (ids.length > 1) {
                break;
            }

            current = current.parentElement;
        }

        return lastValid;
    } catch (error) {
        console.error("[Meta Downloader]", error);
        return null;
    }
}

/**
 * Cria (ou reaproveita) a badge de dias ativos para um card.
 */
function createActiveDaysBadge(activeDays, styleSource) {
    const badge = styleSource.cloneNode(false);
    badge.classList.add("meta-downloader-active-days");
    badge.textContent = activeDays >= 60 ? `🔥 ${activeDays} dias ativo` : `${activeDays} dias ativo`;
    return badge;
}

function findActiveStatusContainer(card) {
    try {
        const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();

        while (node) {
            if (node.nodeValue?.trim().toLowerCase() === "ativo") {
                const textElement = node.parentElement;
                const statusContainer = textElement?.parentElement;
                return {
                    container: statusContainer || textElement,
                    styleSource: textElement
                };
            }
            node = walker.nextNode();
        }
    } catch (error) {
        console.error("[Meta Downloader] Não foi possível localizar o status Ativo:", error);
    }

    return null;
}

/**
 * Aplica visibilidade a um card com base no filtro atual (currentFilterDays)
 * e no valor de dias ativos já armazenado em dataset.
 */
function applyCardVisibility(card) {
    try {
        let matchesDays = true;
        let matchesCta = true;

        if (currentFilterDays !== 0) {
            const activeDaysAttr = card.dataset.metaDownloaderActiveDays;

            // Data inválida ou ausente: nunca esconder silenciosamente.
            if (activeDaysAttr !== undefined && activeDaysAttr !== "invalid") {
                const activeDays = parseInt(activeDaysAttr, 10);
                matchesDays = !Number.isNaN(activeDays) && activeDays >= currentFilterDays;
            }
        }

        if (currentFilterCta !== "all") {
            const cta = card.dataset.metaDownloaderCta || "none";
            matchesCta = currentFilterCta.startsWith("category:")
                ? card.dataset.metaDownloaderCtaCategory === currentFilterCta.slice(9)
                : cta === currentFilterCta.slice(4);
        }

        if (matchesDays && matchesCta) {
            card.classList.remove("meta-downloader-hidden");
        } else {
            card.classList.add("meta-downloader-hidden");
        }
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }
}

/**
 * Reaplica o filtro atualmente selecionado em todos os cards já processados.
 */
function applyActiveDaysFilter() {
    try {
        const cards = document.querySelectorAll('[data-meta-downloader-ad-processed="true"]');
        cards.forEach((card) => {
            applyCardVisibility(card);
        });
        console.log("[Meta Downloader] Filtro aplicado:", currentFilterDays === 0 ? "Todos" : `${currentFilterDays}+ dias`);
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }
}

/**
 * Processa um card de anúncio: extrai ID/data, calcula dias ativos,
 * cria a badge (sem duplicar) e aplica o filtro vigente.
 */
function processAdCard(card) {
    try {
        if (card.dataset.metaDownloaderAdProcessed === "true") {
            applyCardVisibility(card);
            return;
        }

        const libraryId = extractLibraryId(card);

        if (!libraryId) {
            // Ainda sem ID legível; tenta novamente em uma próxima varredura.
            return;
        }

        const startDate = extractStartDate(card);
        const activeDays = startDate ? calculateActiveDays(startDate) : null;

        if (activeDays === null) {
            card.dataset.metaDownloaderActiveDays = "invalid";
            console.warn("[Meta Downloader] Não foi possível extrair a data de início do anúncio:", libraryId);
        } else {
            card.dataset.metaDownloaderActiveDays = String(activeDays);
        }

        const cta = extractCta(card);
        card.dataset.metaDownloaderCta = cta?.value || "none";
        card.dataset.metaDownloaderCtaCategory = cta?.category || "none";

        if (activeDays !== null && !card.querySelector(".meta-downloader-active-days")) {
            const activeStatus = findActiveStatusContainer(card);
            if (activeStatus) {
                activeStatus.container.appendChild(
                    createActiveDaysBadge(activeDays, activeStatus.styleSource)
                );
            }
        }

        card.dataset.metaDownloaderLibraryId = libraryId;
        card.dataset.metaDownloaderAdProcessed = "true";

        applyCardVisibility(card);
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }
}

/**
 * Localiza os pontos de ancoragem no DOM (texto "Veiculação iniciada em")
 * usando um TreeWalker (mais leve do que varrer "*").
 */
function findDateAnchors() {
    const anchors = [];

    try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (node.nodeValue && node.nodeValue.includes("Veiculação iniciada em")) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        });

        let node = walker.nextNode();
        while (node) {
            if (node.parentElement) {
                anchors.push(node.parentElement);
            }
            node = walker.nextNode();
        }
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }

    return anchors;
}

/**
 * Varre a página em busca de cards de anúncio ainda não processados.
 */
function scanAdCards() {
    try {
        const anchors = findDateAnchors();
        const seenCards = new Set();

        anchors.forEach((anchor) => {
            const card = findAdCard(anchor);
            if (card && !seenCards.has(card)) {
                seenCards.add(card);
                processAdCard(card);
            }
        });
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }
}

function findStatusOnlineRow() {
    try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();

        while (node) {
            if (node.nodeValue?.trim().toLowerCase() === "status online") {
                const statusText = node.parentElement;
                const statusContent = statusText?.parentElement;
                return statusContent?.parentElement || statusContent || statusText;
            }
            node = walker.nextNode();
        }
    } catch (error) {
        console.error("[Meta Downloader] Não foi possível localizar Status online:", error);
    }

    return null;
}

/**
 * Cria a interface do filtro na mesma linha do status online.
 */
function createActiveDaysFilter() {
    try {
        const statusRow = findStatusOnlineRow();
        if (!statusRow) {
            return;
        }

        let panel = document.getElementById("meta-downloader-filter-panel");
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "meta-downloader-filter-panel";
            panel.className = "meta-downloader-filter-panel";

            const label = document.createElement("label");
            label.textContent = "Tempo ativo: ";
            label.setAttribute("for", "meta-downloader-filter-select");

            const select = document.createElement("select");
            select.id = "meta-downloader-filter-select";

            const options = [
                { value: "0", label: "Todos" },
                { value: "10", label: "10+ dias" },
                { value: "20", label: "20+ dias" },
                { value: "30", label: "30+ dias" },
                { value: "60", label: "60+ dias" },
                { value: "90", label: "90+ dias" }
            ];

            options.forEach((opt) => {
                const optionEl = document.createElement("option");
                optionEl.value = opt.value;
                optionEl.textContent = opt.label;
                select.appendChild(optionEl);
            });

            select.value = String(currentFilterDays);

            select.addEventListener("change", () => {
                currentFilterDays = parseInt(select.value, 10) || 0;
                applyActiveDaysFilter();
            });

            panel.appendChild(label);
            panel.appendChild(select);

            const ctaLabel = document.createElement("label");
            ctaLabel.textContent = "CTA: ";
            ctaLabel.setAttribute("for", "meta-downloader-cta-select");

            const ctaSelect = document.createElement("select");
            ctaSelect.id = "meta-downloader-cta-select";

            const allCtasOption = document.createElement("option");
            allCtasOption.value = "all";
            allCtasOption.textContent = "Todas";
            ctaSelect.appendChild(allCtasOption);

            CTA_GROUPS.forEach((group) => {
                const categoryOption = document.createElement("option");
                categoryOption.value = `category:${group.key}`;
                categoryOption.textContent = group.label;
                ctaSelect.appendChild(categoryOption);

                const groupElement = document.createElement("optgroup");
                groupElement.label = group.label;
                group.items.forEach((item) => {
                    const option = document.createElement("option");
                    option.value = `cta:${normalizeCta(item)}`;
                    option.textContent = item;
                    groupElement.appendChild(option);
                });
                ctaSelect.appendChild(groupElement);
            });

            ctaSelect.value = currentFilterCta;
            ctaSelect.addEventListener("change", () => {
                currentFilterCta = ctaSelect.value;
                applyActiveDaysFilter();
            });

            panel.appendChild(ctaLabel);
            panel.appendChild(ctaSelect);
        }

        if (panel.parentElement !== statusRow) {
            statusRow.appendChild(panel);
        }
    } catch (error) {
        console.error("[Meta Downloader]", error);
    }
}

// =====================================================================
// Inicialização
// =====================================================================

// Varredura inicial
scanVideos();
scanAdCards();
createActiveDaysFilter();

// Debounce das varreduras para evitar trabalho pesado a cada pequena mutação
let scanTimeoutId = null;
function scheduleScan() {
    if (scanTimeoutId) {
        clearTimeout(scanTimeoutId);
    }
    scanTimeoutId = setTimeout(() => {
        scanVideos();
        scanAdCards();
        // Recria o painel se o Facebook remover/re-renderizar o body
        createActiveDaysFilter();
    }, 300);
}

// Observa mudanças no DOM (scroll infinito da Meta Ads Library)
const observer = new MutationObserver(() => {
    scheduleScan();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
