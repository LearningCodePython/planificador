import React, { useEffect, useMemo, useRef, useState } from 'react';
import Joyride from 'react-joyride';

const STORAGE_KEY = 'planificador.tour.v1.completed';
const START_EVENT = 'planificador:tour:start';

function isTourCompleted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (_e) {
    return false;
  }
}

function setTourCompleted(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch (_e) {
    // noop
  }
}

function GuidedTour({ activeView, setActiveView, isAdmin }) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const latestActiveView = useRef(activeView);

  useEffect(() => {
    latestActiveView.current = activeView;
  }, [activeView]);

  const steps = useMemo(() => {
    const base = [
      {
        target: 'body',
        placement: 'center',
        title: 'Tour guiado',
        content: 'Te enseño lo básico para empezar: pestañas, bolsa, mesa y ejecutados.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="nav-tabs"]',
        placement: 'bottom',
        title: 'Navegación',
        content: 'Usa estas pestañas para moverte entre las secciones principales.',
      },
      {
        target: '[data-tour="tab-dashboard"]',
        placement: 'bottom',
        title: 'Dashboard (Carga)',
        content: 'Aquí tienes resúmenes y gráficos de carga/capacidad.',
        view: 'dashboard',
      },
      {
        target: '[data-tour="dashboard-workload"]',
        placement: 'top',
        title: 'Carga por persona',
        content: 'Visualiza horas asignadas vs disponibilidad mensual.',
        view: 'dashboard',
      },
      {
        target: '[data-tour="tab-planning"]',
        placement: 'bottom',
        title: 'Planificación',
        content: 'Bolsa de aceptados + mesa de planificación + lista de planificados.',
        view: 'planning',
      },
      {
        target: '[data-tour="planning-accepted-bag"]',
        placement: 'top',
        title: 'Bolsa de aceptados',
        content: 'Entrada rápida: nombre, nº, cliente, #Ticket y PDF opcional.',
        view: 'planning',
      },
      {
        target: '[data-tour="planning-board"]',
        placement: 'top',
        title: 'Mesa de planificación',
        content: 'Planifica fechas, personal y desglose de horas.',
        view: 'planning',
      },
      {
        target: '[data-tour="tab-executed"]',
        placement: 'bottom',
        title: 'Ejecutados',
        content: 'Presupuestos terminados archivados con su planificación.',
        view: 'executed',
      },
      {
        target: '[data-tour="executed-search"]',
        placement: 'bottom',
        title: 'Búsqueda',
        content: 'Filtra ejecutados por número de presupuesto.',
        view: 'executed',
      },
      {
        target: '[data-tour="tab-personnel"]',
        placement: 'bottom',
        title: 'Gestión de personal',
        content: 'Define capacidad por rol: horas/día y días/semana.',
        view: 'personnel',
      },
      {
        target: '[data-tour="personnel-form"]',
        placement: 'top',
        title: 'Alta/edición',
        content: 'Crea o edita personal; impacta en la capacidad del dashboard.',
        view: 'personnel',
      },
      {
        target: '[data-tour="tour-button"]',
        placement: 'bottom',
        title: 'Repetir el tour',
        content: 'Puedes relanzar el tour cuando quieras desde este botón.',
      },
    ];

    if (isAdmin) {
      base.splice(10, 0, {
        target: '[data-tour="tab-users"]',
        placement: 'bottom',
        title: 'Usuarios (admin)',
        content: 'Aquí gestionas usuarios, roles y activación.',
        view: 'users',
      });
    }

    return base;
  }, [isAdmin]);

  const start = () => {
    setTourCompleted(false);
    setStepIndex(0);
    setRun(true);
  };

  useEffect(() => {
    const onStart = () => start();
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, []);

  useEffect(() => {
    if (run) return;
    if (isTourCompleted()) return;
    const id = window.setTimeout(() => {
      setRun(true);
    }, 350);
    return () => window.clearTimeout(id);
  }, [run]);

  useEffect(() => {
    if (!run) return;
    const step = steps[stepIndex];
    const desiredView = step?.view;
    if (!desiredView) return;
    if (latestActiveView.current === desiredView) return;

    setRun(false);
    setActiveView(desiredView);
    const id = window.setTimeout(() => setRun(true), 0);
    return () => window.clearTimeout(id);
  }, [run, stepIndex, steps, setActiveView]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      spotlightClicks
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Terminar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#4F46E5',
        },
      }}
      callback={(data) => {
        const { action, index, status, type } = data;

        if (status === 'finished' || status === 'skipped') {
          setTourCompleted(true);
          setRun(false);
          setStepIndex(0);
          return;
        }

        if (action === 'close') {
          setTourCompleted(true);
          setRun(false);
          setStepIndex(0);
          return;
        }

        if (type === 'step:after') {
          setStepIndex(index + 1);
          return;
        }

        if (type === 'target:notFound') {
          setStepIndex(index + 1);
        }
      }}
    />
  );
}

export default GuidedTour;

