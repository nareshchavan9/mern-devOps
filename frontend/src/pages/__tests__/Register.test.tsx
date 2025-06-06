import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../Register';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('@/services/api', () => ({
  authService: {
    register: jest.fn().mockResolvedValue({}),
  },
}));

describe('Register Page', () => {
  it('renders registration form', () => {
    render(<BrowserRouter><Register /></BrowserRouter>);
    expect(screen.getByText(/Register as a Voter/i)).toBeInTheDocument();
  });

  it('shows error for invalid email', async () => {
    render(<BrowserRouter><Register /></BrowserRouter>);
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'invalid' } });
    fireEvent.blur(screen.getByLabelText(/Email Address/i));
    await waitFor(() => {
      expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
    });
  });
});
