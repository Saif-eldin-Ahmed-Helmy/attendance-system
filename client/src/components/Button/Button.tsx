import React from 'react';
import {Button} from "react-bootstrap";
import './Button.css';

interface ButtonProps {
    className?: string;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link';
    style?: React.CSSProperties;
    size?: 'lg' | 'sm';
    disabled?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
}

const ButtonComponent: React.FC<ButtonProps> = ({
                                                    className = 'custom-button',
                                                    type = 'button',
                                                    variant = 'primary',
                                                    size,
                                                    disabled = false,
                                                    onClick,
                                                    children,
    style = {backgroundColor: 'gold'}
                                                }) => {
    const classes = `btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`;

    return (
        <Button style={style} type={type} className={classes} disabled={disabled} onClick={onClick}>
            {children}
        </Button>
    );
};

export default ButtonComponent;