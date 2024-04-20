import { useState } from "react";
import { Form } from "react-bootstrap";

interface CheckboxProps {
    onCheckboxChange: (checked: boolean) => void;
    checked?: boolean;
}

const CheckboxComponent: React.FC<CheckboxProps> = ({ onCheckboxChange, checked = true }) => {
    const [isChecked, setIsChecked] = useState(checked);

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsChecked(event.target.checked);
        onCheckboxChange(event.target.checked);
    };

    return (
        <Form.Check
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            style={{ transform: 'scale(2)', color: '#f5f5f5', border: '1px solid #f5f5f5' }}
        />
    );
};

export default CheckboxComponent;