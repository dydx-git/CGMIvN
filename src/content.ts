const menuBtns: Element[] = [];

var obs = new MutationObserver(function (mutations) {
    for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        for (let j = 0; j < mutation.addedNodes.length; j++) {
            if (mutation.addedNodes[j].nodeType == 1) {
                let node: HTMLElement = <HTMLElement>mutation.addedNodes[j];
                const menuBtn = node.querySelector("[role=button][data-tooltip=More]");
                if (!menuBtn || menuBtns.some(btn => btn.id == menuBtn.id)) continue;

                menuBtns.push(menuBtn);
            }
        }
    }
    menuBtns.map(btn => {
        btn.addEventListener("mouseover", InjectCopyMsgIdBtn);
        btn.addEventListener("click", InjectCopyMsgIdBtn);
    });
});
obs.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });

function InjectCopyMsgIdBtn() {
    const menu: Element | null = document.querySelector("[role=presentation] [role=menu]");
    if (!menu) {
        console.info("No menu found");
        return;
    }
    if (btnInjectedAlready(menu)) {
        // console.info("button injected already");
        return;
    }
    let copyMsgIdItem: Element | null = <Element>menu.querySelector("[aria-hidden=false]");
    if (!copyMsgIdItem) {
        console.info("could not clone any menu button");
        return;
    }
    const clone = copyMsgIdItem.cloneNode(true);
    menu.appendChild(clone);

    setMenuItemProps(clone);
    setMenuItemListeners(clone);
}

function setMenuItemProps(menuItem: Node) {
    let item = menuItem as Element;
    item.id = 'copy-msg-id';

    let lastElement: Element | null = null;
    walk(item, function (node: Node) {
        const element = node as Element;
        if (!element.id)
            element.id += '-copy-msg-id';

        if (!lastElement && element.tagName != "IMG") lastElement = element;
    });

    lastElement!.textContent = "Copy Message ID";
    item.setAttribute("aria-label", "Copy Message ID");
}

function setMenuItemListeners(menuItem: Node) {
    let item = menuItem as Element;

    item.addEventListener("mouseover", () => item.classList.add("J-N-JT"));
    item.addEventListener("mouseout", () => item.classList.remove("J-N-JT"));
    item.addEventListener("click", () => {
        let msgId = "";
        const menu = item.parentElement;
        if (menu) menu.style.display = "none";
        (async () => {
            msgId = await getMsgId();

            if (msgId) copyTextToClipboard(msgId);
        })();
    });
}

function btnInjectedAlready(menu: Element) {
    return menu.querySelector("#copy-msg-id") != null;
}

function walk(node: Node, func: CallableFunction) {
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++)  // Children are siblings to each other
        walk(children[i], func);
    func(node);
}

async function getMsgId() {
    const htmlTxt = await makeRequest(buildUrl());
    if (!htmlTxt) return "";
    const parser = new DOMParser();
    const html = parser.parseFromString(htmlTxt, 'text/html');
    const msgId = html.querySelector('.message_id')?.textContent;
    return `rfc822msgid:${msgId}`;
}

function buildUrl(): string {
    const msgId = document.querySelector('[data-message-id]')?.getAttribute('data-message-id')?.replace('#', '');
    let ikValue = document.querySelector('[data-inboxsdk-ik-value]')?.getAttribute('data-inboxsdk-ik-value');
    if (!ikValue)
        ikValue = fallbackGetIkValue();
    
    if (!msgId || !ikValue) {
        console.log(msgId);
        console.log(ikValue);
        
        console.error("Could not find message id or ik value");
        return "";
    }

    let urlStr: string = "";
    const bases = document.getElementsByTagName('base');
    for (let i = 0; i < bases.length; i++) {
        const element = bases[i] as HTMLElement;
        if (element.getAttribute('href')?.includes('mail.google.com')) {
            urlStr = element.getAttribute('href')!;
            break;
        }
    }
    if (!urlStr) {
        console.error("Could not find base url");
        return "";
    }

    const url = new URL(urlStr);
    url.searchParams.append('ik', ikValue);
    url.searchParams.append('view', 'om');
    url.searchParams.append('permmsgid', msgId);

    return url.toString();
}

async function makeRequest(url: string): Promise<string> {
    if (!url) {
        console.error("url is null");
        return "";
    }

    var response = await fetch(url);
    switch (response.status) {
        case 200:
            var template = await response.text();
            return template;
        case 404:
            console.error('Not Found');
            break;
    }
    console.error("Could not get message id");
    return "";
}

function fallbackGetIkValue() : string|null {
    const html = document.documentElement.innerHTML;
    const start = html.indexOf('GM_ID_KEY');
    const end = html.indexOf(';', start);
    const ikValue = html.substring(start, end + 1);
    if (!eval) {
        return null;
    }
    return getValueFromAssignment(ikValue);
}

function getValueFromAssignment(assignment: string): string {
    const start = assignment.indexOf('=');
    const end = assignment.indexOf(';', start);
    const result = assignment.substring(start + 1, end);
    return result.replaceAll('"', '');
}

function fallbackCopyTextToClipboard(text: string) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    document.body.removeChild(textArea);
}

function copyTextToClipboard(text: string) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function () {
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}

export { }