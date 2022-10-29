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
    menuBtns.map(btn => btn.addEventListener("click", InjectCopyMsgIdBtn))
});
obs.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });

function InjectCopyMsgIdBtn() {
    const menu: Element | null = document.querySelector("[role=presentation] [role=menu]");
    if (!menu) return;
    if (btnInjectedAlready(menu)) return;
    let copyMsgIdItem: Element | null = <Element>menu.querySelector("[aria-hidden=false]");
    if (!copyMsgIdItem) return;
    const clone = copyMsgIdItem.cloneNode(true);

    setMenuItemProps(clone);
    setMenuItemListeners(clone);
    menu.appendChild(clone);
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
    const ikValue = document.querySelector('[data-inboxsdk-ik-value]')?.getAttribute('data-inboxsdk-ik-value');
    if (!msgId || !ikValue) return "";

    let urlStr: string = "";
    const bases = document.getElementsByTagName('base');
    for (let i = 0; i < bases.length; i++) {
        const element = bases[i] as HTMLElement;
        if (element.getAttribute('href')?.includes('mail.google.com')) {
            urlStr = element.getAttribute('href')!;
            break;
        }
    }
    if (!urlStr) return "";

    const url = new URL(urlStr);
    url.searchParams.append('ik', ikValue);
    url.searchParams.append('view', 'om');
    url.searchParams.append('permmsgid', msgId);

    return url.toString();
}

async function makeRequest(url: string): Promise<string> {
    if (!url) return "";

    var response = await fetch(url);
    switch (response.status) {
        case 200:
            var template = await response.text();
            return template;
        case 404:
            console.log('Not Found');
            break;
    }
    return "";
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

    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

function copyTextToClipboard(text: string) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(function () {
        console.log('Async: Copying to clipboard was successful!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
    });
}

export {}