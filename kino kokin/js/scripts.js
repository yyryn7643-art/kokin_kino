/* =====================================================================
   Online Cinema — интерактив: выбор мест, итоговая сумма, модальное окно
   ---------------------------------------------------------------------
   План файла:
   1. Данные: схема зала и цена билета
   2. Построение мест в зале
   3. Выбор места
   4. Итоговая сумма
   5. Дата, кинотеатр, время
   6. Оплата и модальное окно
   7. Меню для мобильных устройств
   ===================================================================== */

'use strict';

/* ---------- 1. Данные: схема зала и цена билета ---------- */

// цена одного билета в рублях
const TICKET_PRICE = 500;

// схема зала: первый блок — 4 ряда по 17 мест, второй — 4 ряда по 8 + 8 мест
const HALL = [
    { type: 'row', row: 1, seats: 17, booked: [5, 11, 13, 14] },
    { type: 'row', row: 2, seats: 17, booked: [6] },
    { type: 'row', row: 3, seats: 17, booked: [9, 12] },
    { type: 'row', row: 4, seats: 17, booked: [] },
    { type: 'aisle' },
    { type: 'split', row: 5, seats: 8, booked: [] },
    { type: 'split', row: 6, seats: 8, booked: [3] },
    { type: 'split', row: 7, seats: 8, booked: [7] },
    { type: 'split', row: 8, seats: 8, booked: [] }
];

// сюда попадают все созданные места: { element, row, place, booked }
const seats = [];

/* ---------- 2. Построение мест в зале ---------- */

const rowsContainer = document.getElementById('hall-rows');

/**
 * Создаёт одно место в зале.
 * @param {number} row номер ряда
 * @param {number} place номер места
 * @param {boolean} booked место уже занято
 * @returns {HTMLButtonElement}
 */
function createSeat(row, place, booked) {
    const seat = document.createElement('button');

    seat.type = 'button';
    seat.className = 'seat ' + (booked ? 'seat--booked' : 'seat--free');
    seat.dataset.row = row;
    seat.dataset.place = place;
    seat.setAttribute('aria-pressed', 'false');
    seat.setAttribute('aria-label',
        'Ряд ' + row + ', место ' + place + (booked ? ', занято' : ', свободно'));

    if (booked) {
        seat.disabled = true;
    } else {
        seat.addEventListener('click', onSeatClick);
    }

    seats.push({ element: seat, row: row, place: place, booked: booked });
    return seat;
}

/**
 * Создаёт группу мест одного ряда.
 */
function createSeatGroup(row, from, to, bookedList) {
    const group = document.createElement('div');
    group.className = 'row__group';

    for (let place = from; place <= to; place++) {
        group.append(createSeat(row, place, bookedList.includes(place)));
    }
    return group;
}

/**
 * Рисует весь зал по схеме HALL.
 */
function renderHall() {
    HALL.forEach(function (item) {
        if (item.type === 'aisle') {
            const aisle = document.createElement('div');
            aisle.className = 'hall__aisle';
            rowsContainer.append(aisle);
            return;
        }

        const rowElement = document.createElement('div');
        rowElement.className = 'row';

        if (item.type === 'row') {
            rowElement.append(createSeatGroup(item.row, 1, item.seats, item.booked));
        } else {
            // второй блок: два ряда по 8 мест с проходом посередине
            const left = createSeatGroup(item.row, 1, item.seats, item.booked);
            left.classList.add('row__group--left');

            const right = createSeatGroup(item.row, item.seats + 1, item.seats * 2, item.booked);
            rowElement.append(left, right);
        }

        rowsContainer.append(rowElement);
    });
}

/* ---------- 3. Выбор места ---------- */

const selectedSeats = [];

/**
 * Клик по свободному месту: выбрать или снять выбор.
 */
function onSeatClick(event) {
    const seat = event.currentTarget;
    const isActive = seat.classList.contains('seat--active');

    if (isActive) {
        seat.classList.remove('seat--active');
        seat.classList.remove('seat--pop');
        seat.setAttribute('aria-pressed', 'false');
        removeFromSelected(seat);
    } else {
        seat.classList.add('seat--active', 'seat--pop');
        seat.setAttribute('aria-pressed', 'true');
        selectedSeats.push({ row: Number(seat.dataset.row), place: Number(seat.dataset.place) });

        // убираем класс анимации, чтобы её можно было запустить повторно
        window.setTimeout(function () {
            seat.classList.remove('seat--pop');
        }, 260);
    }

    updateTotal();
}

/**
 * Убирает место из массива выбранных.
 */
function removeFromSelected(seat) {
    const row = Number(seat.dataset.row);
    const place = Number(seat.dataset.place);

    for (let i = selectedSeats.length - 1; i >= 0; i--) {
        if (selectedSeats[i].row === row && selectedSeats[i].place === place) {
            selectedSeats.splice(i, 1);
        }
    }
}

/**
 * Снимает выбор со всех мест (при смене даты, кинотеатра или времени).
 */
function resetSelection() {
    seats.forEach(function (item) {
        item.element.classList.remove('seat--active', 'seat--pop');
        item.element.setAttribute('aria-pressed', 'false');
    });
    selectedSeats.length = 0;
    updateTotal();
}

/* ---------- 4. Итоговая сумма ---------- */

const totalElement = document.getElementById('total');
const selectedInfo = document.getElementById('selected-info');

/**
 * Пересчитывает сумму и подпись под ней.
 */
function updateTotal() {
    const total = selectedSeats.length * TICKET_PRICE;

    // плавно «докручиваем» число до нового значения
    animateNumber(totalElement, Number(totalElement.textContent) || 0, total, 320);

    if (selectedSeats.length === 0) {
        selectedInfo.textContent = 'Места не выбраны';
        return;
    }

    const places = selectedSeats
        .slice()
        .sort(function (a, b) {
            return a.row - b.row || a.place - b.place;
        })
        .map(function (item) {
            return 'ряд ' + item.row + ', место ' + item.place;
        })
        .join(' · ');

    const word = plural(selectedSeats.length, ['место', 'места', 'мест']);
    selectedInfo.textContent = selectedSeats.length + ' ' + word + ': ' + places;
}

/**
 * Анимирует изменение числа.
 */
function animateNumber(element, from, to, duration) {
    if (from === to) {
        element.textContent = to;
        return;
    }

    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        element.textContent = Math.round(from + (to - from) * progress);
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);

    // страховка: если кадры не приходят (фоновая вкладка), сразу показываем итог
    window.setTimeout(function () {
        element.textContent = to;
    }, duration + 60);
}

/**
 * Склонение существительных: 1 место, 2 места, 5 мест.
 */
function plural(number, forms) {
    const mod10 = number % 10;
    const mod100 = number % 100;

    if (mod10 === 1 && mod100 !== 11) {
        return forms[0];
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        return forms[1];
    }
    return forms[2];
}

/* ---------- 5. Дата, кинотеатр, время ---------- */

const dateButtons = document.querySelectorAll('.date');

dateButtons.forEach(function (button) {
    button.addEventListener('click', function () {
        dateButtons.forEach(function (item) {
            item.classList.remove('date--active');
        });
        button.classList.add('date--active');
        resetSelection();
    });
});

document.getElementById('cinema').addEventListener('change', resetSelection);
document.getElementById('time').addEventListener('change', resetSelection);

/* ---------- 6. Оплата и модальное окно ---------- */

const modal = document.getElementById('modal');
const modalText = document.getElementById('modal-text');
const payButton = document.getElementById('pay');

/**
 * Показывает всплывающее окно с подробностями заказа.
 */
function openModal(text, title) {
    modal.querySelector('#modal-title').textContent = title;
    modalText.textContent = text;
    modal.hidden = false;
    modal.querySelector('.modal__btn').focus();
}

function closeModal() {
    modal.hidden = true;
    payButton.focus();
}

/* ---------- 5.1. Окно о фильме и информационные окна ---------- */

const playButton = document.querySelector('.header__play');
const filmCard = document.getElementById('film-card');

function openFilmCard() {
    filmCard.hidden = false;
    filmCard.querySelector('.lightbox__close').focus();
}

function closeFilmCard() {
    filmCard.hidden = true;
    playButton.focus();
}

playButton.addEventListener('click', openFilmCard);

filmCard.addEventListener('click', function (event) {
    if (event.target.hasAttribute('data-close')) {
        closeFilmCard();
    }
});

// короткие информационные окна для пунктов меню «События» и «Поддержка»
const INFO = {
    events: {
        title: 'События кинотеатра',
        text: 'Ночь кино — 30 апреля, три фильма подряд с 22:00. ' +
              'Премьера «Мстители: финал» — 2 мая. ' +
              'Семейный утренник — каждое воскресенье в 11:00.'
    },
    support: {
        title: 'Поддержка',
        text: 'Телефон: 8 800 555-35-35 (круглосуточно). ' +
              'Почта: help@online-cinema.ru. ' +
              'Возврат билета — не позднее чем за 2 часа до сеанса на сайте или по телефону.'
    }
};

document.querySelectorAll('[data-info]').forEach(function (button) {
    button.addEventListener('click', function () {
        const info = INFO[button.dataset.info];
        openModal(info.text, info.title);
    });
});
payButton.addEventListener('click', function () {
    if (selectedSeats.length === 0) {
        openModal('Чтобы продолжить, выберите хотя бы одно место в зале.', 'Места не выбраны');
        return;
    }

    const date = document.querySelector('.date--active .date__day').textContent;
    const month = document.querySelector('.date--active .date__month').textContent.toLowerCase();
    const cinema = document.getElementById('cinema').value;
    const time = document.getElementById('time').value;
    const total = selectedSeats.length * TICKET_PRICE;
    const word = plural(selectedSeats.length, ['место', 'места', 'мест']);

    openModal(
        'Фильм «Мстители: война бесконечности», ' + date + ' ' + month + ', ' + time +
        ', «' + cinema + '». Выбрано ' + selectedSeats.length + ' ' + word + ' на сумму ' +
        total + ' ₽.',
        'Билеты забронированы'
    );
});

// закрытие окна: крестик-подложка, кнопка и клавиша Esc
modal.addEventListener('click', function (event) {
    if (event.target.hasAttribute('data-close')) {
        closeModal();
    }
});

document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') {
        return;
    }
    if (!filmCard.hidden) {
        closeFilmCard();
    } else if (!modal.hidden) {
        closeModal();
    }
});

/* ---------- 7. Меню для мобильных устройств ---------- */

const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', function () {
    const isOpen = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', String(isOpen));
});

nav.addEventListener('click', function (event) {
    if (event.target.closest('.nav__link')) {
        nav.classList.remove('nav--open');
        burger.setAttribute('aria-expanded', 'false');
    }
});

/* ---------- запуск ---------- */

renderHall();
updateTotal();
