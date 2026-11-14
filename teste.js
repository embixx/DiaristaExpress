/* teste.js - "computador e celular" do DiaristaExpress, para testar no PC.
 *
 * Mostra o mesmo app duas vezes, lado a lado: numa moldura de notebook
 * (1280 x 800) e num aparelho (390 x 844), as duas reduzidas para caber na
 * janela. Mesma origem = mesma conta e mesmos dados nas duas.
 *
 * Atualizacao: le o manifesto do canal ao abrir, a cada 2 minutos e quando a
 * janela volta ao foco. Saiu versao nova? Aparece a faixa amarela com
 * "Atualizar agora" - e o botao Atualizar do topo confere na hora.
 */
(function () {
  var CHAVE_APP = 'dx:app';
  var INTERVALO = 2 * 60 * 1000;
  var versaoCarregada = null;
  var $ = function (id) { return document.getElementById(id); };

  function lerManifesto() {
    return fetch('./atualizacoes/manifesto.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function appAtual() {
    try { return localStorage.getItem(CHAVE_APP) === 'diarista' ? 'diarista' : 'cliente'; } catch (e) { return 'cliente'; }
  }

  function marcarApp() {
    var botoes = document.querySelectorAll('[data-app]');
    for (var i = 0; i < botoes.length; i++) botoes[i].setAttribute('aria-pressed', String(botoes[i].dataset.app === appAtual()));
  }

  function carregarQuadros(v) {
    try { localStorage.setItem(CHAVE_APP, appAtual()); } catch (e) { /* sem armazenamento */ }
    // ?v= muda a cada versao: o navegador nunca reaproveita o app velho.
    // O app escolhido e a hora entram no endereco: moldura com o mesmo
    // endereco de antes nao recarrega, e a troca de app nao aparecia.
    var endereco = './index.html?v=' + encodeURIComponent(v || 'sem-canal') + '&app=' + appAtual() + '&t=' + Date.now() + '#/';
    $('computador').src = endereco;
    $('celular').src = endereco;
  }

  // ------------------------------------------------------------- escala
  function encaixar(el) {
    if (el.parentElement.classList.contains('encaixe')) return el.parentElement;
    var caixa = document.createElement('div');
    caixa.className = 'encaixe';
    el.parentElement.insertBefore(caixa, el);
    caixa.appendChild(el);
    return caixa;
  }

  function escalar(el, area, largura, altura) {
    var caixa = encaixar(el);
    var s = Math.min(area.clientWidth / largura, area.clientHeight / altura, 1);
    el.style.width = largura + 'px';
    el.style.height = altura + 'px';
    el.style.transform = 'scale(' + s + ')';
    caixa.style.width = Math.floor(largura * s) + 'px';
    caixa.style.height = Math.floor(altura * s) + 'px';
  }

  function ajustar() {
    escalar($('computador'), $('area-computador'), 1280, 800);
    // O aparelho tem 12 px de moldura de cada lado.
    escalar(document.querySelector('.aparelho'), $('area-celular'), 390 + 24, 844 + 24);
  }

  // --------------------------------------------------------- atualizacao
  function mostrarVersao(v) {
    $('versao').textContent = v ? 'versão ' + v : 'sem conexão com o canal';
  }

  function procurar(manual) {
    return lerManifesto().then(function (m) {
      if (!m || !m.versao) {
        if (manual) mostrarVersao(null);
        return;
      }
      if (!versaoCarregada) {
        versaoCarregada = m.versao;
        mostrarVersao(m.versao);
        carregarQuadros(m.versao);
        return;
      }
      if (m.versao !== versaoCarregada) {
        $('aviso-texto').textContent = 'Saiu a versão ' + m.versao + ' (você está vendo a ' + versaoCarregada + ').';
        $('aviso').hidden = false;
        $('aviso-botao').dataset.versao = m.versao;
        if (manual) aplicar(m.versao);
      } else if (manual) {
        $('versao').textContent = 'versão ' + m.versao + ' · já é a mais nova';
        setTimeout(function () { mostrarVersao(versaoCarregada); }, 2500);
      }
    });
  }

  function aplicar(v) {
    versaoCarregada = v;
    mostrarVersao(v);
    $('aviso').hidden = true;
    carregarQuadros(v);
  }

  // ------------------------------------------------------------- ligacoes
  var botoesApp = document.querySelectorAll('[data-app]');
  for (var i = 0; i < botoesApp.length; i++) {
    botoesApp[i].addEventListener('click', function (e) {
      try { localStorage.setItem(CHAVE_APP, e.currentTarget.dataset.app); } catch (err) { /* sem armazenamento */ }
      marcarApp();
      carregarQuadros(versaoCarregada);
    });
  }
  // Entrou (ou saiu) numa moldura? A outra acompanha. O evento `storage`
  // chega aqui porque as molduras gravam no mesmo armazenamento da pagina.
  var esperaSessao = 0;
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf('dx:sess') !== 0) return;
    clearTimeout(esperaSessao);
    esperaSessao = setTimeout(function () {
      ['computador', 'celular'].forEach(function (id) {
        try {
          var w = $(id).contentWindow;
          var naEntrada = (w.location.hash || '').indexOf('entrar') >= 0;
          if (e.newValue ? naEntrada : !naEntrada) w.location.reload();
        } catch (err) { /* moldura ainda carregando */ }
      });
    }, 600);
  });
  $('atualizar').addEventListener('click', function () { procurar(true); });
  $('aviso-botao').addEventListener('click', function (e) { aplicar(e.currentTarget.dataset.versao); });
  window.addEventListener('resize', ajustar);
  window.addEventListener('focus', function () { procurar(false); });
  setInterval(function () { procurar(false); }, INTERVALO);

  // Sem escolha ainda: abre no Cliente; os botoes do topo trocam.
  try { if (!localStorage.getItem(CHAVE_APP)) localStorage.setItem(CHAVE_APP, 'cliente'); } catch (e) { /* sem armazenamento */ }
  marcarApp();
  ajustar();
  procurar(false).then(function () {
    if (!versaoCarregada) carregarQuadros(null); // sem canal: abre assim mesmo
  });
})();
